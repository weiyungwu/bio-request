import { describe, it, expect } from 'vitest'
import { validateQuestionBank } from '@/utils/questionBank'

const base = {
  courseId: 'bio-01',
  topic: '細胞器功能',
  knowledgeIds: ['b-nucleus'],
  difficulty: 'easy',
  question: '題目',
  explanation: '解析',
  source: '第一關教材',
}
const single = {
  ...base,
  id: 'bio-01-single',
  type: 'single_choice',
  options: ['A', 'B', 'C'],
  answer: 1,
}
const trueFalse = { ...base, id: 'bio-01-tf', type: 'true_false', options: ['對', '錯'], answer: 1 }
const matching = {
  ...base,
  id: 'bio-01-match',
  type: 'matching',
  options: { left: ['甲', '乙'], right: ['一', '二'] },
  answer: [1, 0],
}
const ordering = {
  ...base,
  id: 'bio-01-order',
  type: 'ordering',
  options: ['X', 'Y', 'Z'],
  answer: [2, 0, 1],
}

// The stage's knowledge point ids, as getQuestionBank takes them from the lesson data.
const POINTS = new Set(['b-nucleus', 'b-wall'])
const check = (...qs: unknown[]) => validateQuestionBank(qs, 'bio-01', POINTS)
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
      `第 1 題${field === 'id' ? '' : '（bio-01-single）'}：缺少 ${field}`,
    )
  })

  // A blank explanation would show students an empty 解析 box (spec §10.3).
  it('treats blank text as missing content', () => {
    expect(messages({ ...single, explanation: '  ' })).toEqual([
      '第 1 題（bio-01-single）：explanation 必須是非空白文字',
    ])
  })

  // One broken entry must not take the whole quiz down.
  it('keeps the valid questions when another is broken', () => {
    const bank = check(single, { ...trueFalse, type: 'essay' }, ordering)
    expect(bank.questions.map((q) => q.id)).toEqual(['bio-01-single', 'bio-01-order'])
    expect(bank.errors).toEqual([
      { index: 1, id: 'bio-01-tf', message: '第 2 題（bio-01-tf）：未知的題型「essay」' },
    ])
  })

  // The wrong-answer book keys on id (TASK-014: 不會將不同題目錯誤合併).
  it('rejects a duplicate id', () => {
    expect(messages(single, { ...trueFalse, id: 'bio-01-single' })).toEqual([
      '第 2 題（bio-01-single）：id「bio-01-single」重複',
    ])
  })

  // Review I1: ids must stay unique across courses, or TASK-014 could merge two questions.
  it('rejects an id without the course prefix', () => {
    expect(messages({ ...single, id: 'bio-02-q01' })).toEqual([
      '第 1 題（bio-02-q01）：id 必須以「bio-01-」開頭',
    ])
  })

  it('rejects a question filed under another course', () => {
    expect(messages({ ...single, courseId: 'bio-02' })).toEqual([
      '第 1 題（bio-01-single）：courseId「bio-02」與題庫檔案「bio-01」不符',
    ])
  })

  it('rejects an unknown difficulty', () => {
    expect(messages({ ...single, difficulty: 'expert' })).toHaveLength(1)
  })

  // Answers that point nowhere would mark every student wrong.
  it.each([
    ['single choice answer out of range', { ...single, answer: 3 }],
    ['single choice answer not an integer', { ...single, answer: '1' }],
    ['single choice negative answer', { ...single, answer: -1 }],
    ['single choice fractional answer', { ...single, answer: 1.5 }],
    ['single choice duplicate options', { ...single, options: ['A', 'A', 'B'] }],
    ['true/false custom options', { ...trueFalse, options: ['是', '否'] }],
    ['true/false answer 2', { ...trueFalse, answer: 2 }],
    ['matching uneven columns', { ...matching, options: { left: ['甲', '乙'], right: ['一'] } }],
    ['matching answer reuses a right item', { ...matching, answer: [0, 0] }],
    ['matching options as a list', { ...matching, options: ['甲', '乙'] }],
    [
      'matching duplicate left items',
      { ...matching, options: { left: ['甲', '甲'], right: ['一', '二'] } },
    ],
    ['matching answer not a list', { ...matching, answer: 1 }],
    ['ordering answer not a list', { ...ordering, answer: '0,1,2' }],
    ['ordering answer missing an item', { ...ordering, answer: [0, 1] }],
    ['ordering answer repeats an item', { ...ordering, answer: [0, 0, 1] }],
  ])('rejects %s', (_, q) => {
    expect(check(q).questions).toEqual([])
    expect(check(q).errors).toHaveLength(1)
  })

  it('reports a file that is not a list of questions', () => {
    expect(validateQuestionBank({ questions: [] }, 'bio-01', POINTS)).toEqual({
      questions: [],
      errors: [{ index: -1, message: '題庫檔案必須是題目陣列' }],
    })
    expect(messages('q')).toEqual(['第 1 題不是物件'])
  })

  // v1.1: mastery is worked out per knowledge point, so every question must name the
  // points it tests, and only points that exist in this stage's lessons.
  describe('knowledgeIds', () => {
    const { knowledgeIds: _, ...noIds } = single
    it('accepts one or several known points', () => {
      expect(check({ ...single, knowledgeIds: ['b-nucleus', 'b-wall'] }).errors).toEqual([])
    })

    it.each([
      ['missing', noIds, '缺少 knowledgeIds'],
      ['empty', { ...single, knowledgeIds: [] }, 'knowledgeIds 必須是至少 1 個不重複的知識點 id'],
      [
        'not a list',
        { ...single, knowledgeIds: 'b-nucleus' },
        'knowledgeIds 必須是至少 1 個不重複的知識點 id',
      ],
      [
        'repeated',
        { ...single, knowledgeIds: ['b-wall', 'b-wall'] },
        'knowledgeIds 必須是至少 1 個不重複的知識點 id',
      ],
      [
        'not all text',
        { ...single, knowledgeIds: ['b-nucleus', 1] },
        'knowledgeIds 必須是至少 1 個不重複的知識點 id',
      ],
      [
        'unknown',
        { ...single, knowledgeIds: ['b-nucleus', 'c-moon', 'x'] },
        'knowledgeIds 有這一關沒有的知識點：c-moon、x',
      ],
    ])('rejects knowledgeIds that are %s', (_, q, message) => {
      expect(check(q).questions).toEqual([])
      expect(messages(q)).toEqual([`第 1 題（bio-01-single）：${message}`])
    })

    // Without lesson data the cause is the missing lesson file, not each question's ids.
    it('reports a stage without lesson data once, at file level', () => {
      expect(validateQuestionBank([single, trueFalse], 'bio-01', undefined)).toEqual({
        questions: [],
        errors: [{ index: -1, message: '找不到「bio-01」的課程資料，無法檢查 knowledgeIds' }],
      })
    })
  })
})
