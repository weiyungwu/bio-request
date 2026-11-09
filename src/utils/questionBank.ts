import {
  DIFFICULTIES,
  QUESTION_TYPES,
  TRUE_FALSE_OPTIONS,
  type Question,
  type QuestionBank,
  type QuestionDataError,
} from '@/types/question'

const TEXT_FIELDS = ['id', 'courseId', 'topic', 'question', 'explanation', 'source'] as const

type Raw = Record<string, unknown>

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const isTextList = (v: unknown, min: number): v is string[] =>
  Array.isArray(v) && v.length >= min && v.every(isText) && new Set(v).size === v.length
const isIndex = (v: unknown, length: number) =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < length
/** Every index 0..length-1 exactly once. */
const isPermutation = (v: unknown, length: number) =>
  Array.isArray(v) &&
  v.length === length &&
  v.every((i) => isIndex(i, length)) &&
  new Set(v).size === length

/** Problems with options/answer for a known type; empty when valid. */
function answerProblems(q: Raw): string[] {
  const { options, answer } = q
  switch (q.type as Question['type']) {
    case 'single_choice':
      if (!isTextList(options, 2)) return ['options 必須是至少 2 個不重複的文字選項']
      return isIndex(answer, options.length) ? [] : ['answer 必須是 options 的索引（從 0 開始）']
    case 'true_false':
      if (
        !Array.isArray(options) ||
        options.length !== 2 ||
        options.some((o, i) => o !== TRUE_FALSE_OPTIONS[i])
      )
        return [`是非題的 options 必須是 ${JSON.stringify(TRUE_FALSE_OPTIONS)}`]
      return answer === 0 || answer === 1 ? [] : ['是非題的 answer 必須是 0（對）或 1（錯）']
    case 'matching': {
      if (!isObject(options) || !isTextList(options.left, 2) || !isTextList(options.right, 2))
        return ['配對題的 options 必須有 left 與 right，各至少 2 個不重複的文字']
      if (options.left.length !== options.right.length)
        return ['配對題的 left 與 right 數量必須相同']
      return isPermutation(answer, options.left.length)
        ? []
        : ['配對題的 answer 必須讓每個 left 對應到一個不重複的 right 索引']
    }
    case 'ordering':
      if (!isTextList(options, 2)) return ['排序題的 options 必須是至少 2 個不重複的文字']
      return isPermutation(answer, options.length)
        ? []
        : ['排序題的 answer 必須列出每個選項索引各一次']
  }
}

/**
 * Validates a course's question bank file (spec TASK-010: 缺少必要欄位時能顯示資料錯誤).
 * Invalid questions are dropped and reported, so one bad entry doesn't block the quiz.
 */
export function validateQuestionBank(raw: unknown, courseId: string): QuestionBank {
  if (!Array.isArray(raw)) {
    return { questions: [], errors: [{ index: -1, message: '題庫檔案必須是題目陣列' }] }
  }
  const questions: Question[] = []
  const errors: QuestionDataError[] = []
  const seen = new Set<string>()

  raw.forEach((q, index) => {
    if (!isObject(q)) {
      errors.push({ index, message: `第 ${index + 1} 題不是物件` })
      return
    }
    const id = isText(q.id) ? q.id : undefined
    const problems: string[] = []

    for (const field of TEXT_FIELDS) {
      if (!(field in q)) problems.push(`缺少 ${field}`)
      else if (!isText(q[field])) problems.push(`${field} 必須是非空白文字`)
    }
    if (isText(q.courseId) && q.courseId !== courseId)
      problems.push(`courseId「${q.courseId}」與題庫檔案「${courseId}」不符`)
    // Prefix + per-file uniqueness keeps ids unique across courses (file names are unique).
    if (id && !id.startsWith(`${courseId}-`)) problems.push(`id 必須以「${courseId}-」開頭`)
    // An id counts as taken even if its first question was invalid; both are reported.
    if (id && seen.has(id)) problems.push(`id「${id}」重複`)
    if (!('difficulty' in q)) problems.push('缺少 difficulty')
    else if (!DIFFICULTIES.includes(q.difficulty as never))
      problems.push(`difficulty 必須是 ${DIFFICULTIES.join('、')} 之一`)
    if (!('options' in q)) problems.push('缺少 options')
    if (!('answer' in q)) problems.push('缺少 answer')
    if (!('type' in q)) problems.push('缺少 type')
    else if (!QUESTION_TYPES.includes(q.type as never))
      problems.push(`未知的題型「${String(q.type)}」`)
    else if ('options' in q && 'answer' in q) problems.push(...answerProblems(q))

    if (id) seen.add(id)
    const label = `第 ${index + 1} 題${id ? `（${id}）` : ''}`
    if (problems.length === 0) questions.push(q as unknown as Question)
    else for (const message of problems) errors.push({ index, id, message: `${label}：${message}` })
  })

  return { questions, errors }
}
