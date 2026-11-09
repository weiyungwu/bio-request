import { describe, it, expect } from 'vitest'
import { validateQuestionBank } from '@/utils/questionBank'

const base = {
  courseId: 'bio-01',
  topic: '細胞器功能',
  difficulty: 'easy',
  question: '題目',
  explanation: '解析',
  source: '第一關教材',
}
const single = {
  ...base,
  id: 'q-single',
  type: 'single_choice',
  options: ['A', 'B', 'C'],
  answer: 1,
}
const trueFalse = { ...base, id: 'q-tf', type: 'true_false', options: ['對', '錯'], answer: 1 }
const matching = {
  ...base,
  id: 'q-match',
  type: 'matching',
  options: { left: ['甲', '乙'], right: ['一', '二'] },
  answer: [1, 0],
}
const ordering = {
  ...base,
  id: 'q-order',
  type: 'ordering',
  options: ['X', 'Y', 'Z'],
  answer: [2, 0, 1],
}

const check = (...qs: unknown[]) => validateQuestionBank(qs, 'bio-01')
const messages = (...qs: unknown[]) => check(...qs).errors.map((e) => e.message)

describe('validateQuestionBank (TASK-010)', () => {
  // Spec: 不同題型可以正確辨識 — each type's answer shape is accepted as that type.
  it('accepts a valid question of every type and keeps its type', () => {
    const bank = check(single, trueFalse, matching, ordering)
    expect(bank.errors).toEqual([])
    expect(bank.questions.map((q) => q.type)).toEqual([
      'single_choice',
      'true_false',
      'matching',
      'ordering',
    ])
  })

  // Spec: 每題必須包含 id … source; 缺少必要欄位時能顯示資料錯誤.
  it.each([
    'id',
    'courseId',
    'topic',
    'type',
    'difficulty',
    'question',
    'options',
    'answer',
    'explanation',
    'source',
  ])('reports a missing %s and drops the question', (field) => {
    const q: Record<string, unknown> = { ...single }
    delete q[field]
    const bank = check(q)
    expect(bank.questions).toEqual([])
    expect(bank.errors.map((e) => e.message)).toContain(
      `第 1 題${field === 'id' ? '' : '（q-single）'}：缺少 ${field}`,
    )
  })

  // A blank explanation would show students an empty 解析 box (spec §10.3).
  it('treats blank text as missing content', () => {
    expect(messages({ ...single, explanation: '  ' })).toEqual([
      '第 1 題（q-single）：explanation 必須是非空白文字',
    ])
  })

  // One broken entry must not take the whole quiz down.
  it('keeps the valid questions when another is broken', () => {
    const bank = check(single, { ...trueFalse, type: 'essay' }, ordering)
    expect(bank.questions.map((q) => q.id)).toEqual(['q-single', 'q-order'])
    expect(bank.errors).toEqual([
      { index: 1, id: 'q-tf', message: '第 2 題（q-tf）：未知的題型「essay」' },
    ])
  })

  // The wrong-answer book keys on id (TASK-014: 不會將不同題目錯誤合併).
  it('rejects a duplicate id', () => {
    expect(messages(single, { ...trueFalse, id: 'q-single' })).toEqual([
      '第 2 題（q-single）：id「q-single」重複',
    ])
  })

  it('rejects a question filed under another course', () => {
    expect(messages({ ...single, courseId: 'bio-02' })).toEqual([
      '第 1 題（q-single）：courseId「bio-02」與題庫檔案「bio-01」不符',
    ])
  })

  it('rejects an unknown difficulty', () => {
    expect(messages({ ...single, difficulty: 'expert' })).toHaveLength(1)
  })

  // Answers that point nowhere would mark every student wrong.
  it.each([
    ['single choice answer out of range', { ...single, answer: 3 }],
    ['single choice answer not an integer', { ...single, answer: '1' }],
    ['single choice duplicate options', { ...single, options: ['A', 'A', 'B'] }],
    ['true/false custom options', { ...trueFalse, options: ['是', '否'] }],
    ['true/false answer 2', { ...trueFalse, answer: 2 }],
    ['matching uneven columns', { ...matching, options: { left: ['甲', '乙'], right: ['一'] } }],
    ['matching answer reuses a right item', { ...matching, answer: [0, 0] }],
    ['matching options as a list', { ...matching, options: ['甲', '乙'] }],
    ['ordering answer missing an item', { ...ordering, answer: [0, 1] }],
    ['ordering answer repeats an item', { ...ordering, answer: [0, 0, 1] }],
  ])('rejects %s', (_, q) => {
    expect(check(q).questions).toEqual([])
    expect(check(q).errors).toHaveLength(1)
  })

  it('reports a file that is not a list of questions', () => {
    expect(validateQuestionBank({ questions: [] }, 'bio-01')).toEqual({
      questions: [],
      errors: [{ index: -1, message: '題庫檔案必須是題目陣列' }],
    })
    expect(messages('q')).toEqual(['第 1 題不是物件'])
  })
})
