import { describe, it, expect } from 'vitest'
import { getLessonData } from '@/data/lessons'
import { getQuestionBank } from '@/data/questions'
import type { Question } from '@/types/question'

// TASK-010 / spec.txt 5.4: stage 1 bank of at least 10 questions (5 drawn per quiz).
describe('bio-01 question bank', () => {
  const bank = getQuestionBank('bio-01')!
  const qs = bank.questions

  it('loads from JSON with no data errors', () => {
    expect(bank.errors).toEqual([])
    expect(qs.length).toBeGreaterThanOrEqual(10)
  })

  // spec 5.4 題目涵蓋 the four areas taught in stage 1.
  it('covers every spec 5.4 topic', () => {
    expect(new Set(qs.map((q) => q.topic))).toEqual(
      new Set(['生命的特徵', '細胞構造', '細胞器功能', '動植物細胞差異']),
    )
  })

  // FR-05: the bank exercises every supported type, so TASK-011 renders all of them.
  it('includes every question type', () => {
    expect(new Set(qs.map((q) => q.type))).toEqual(
      new Set(['single_choice', 'true_false', 'matching', 'ordering']),
    )
  })

  it('ids are prefixed with the course so they stay unique across stages', () => {
    expect(qs.filter((q) => !q.id.startsWith('bio-01-q'))).toEqual([])
  })

  // A true/false explanation that opens with the opposite verdict contradicts the key.
  it('true/false explanations open with the keyed verdict', () => {
    const tf = qs.filter(
      (q): q is Extract<Question, { type: 'true_false' }> => q.type === 'true_false',
    )
    expect(tf.filter((q) => !q.explanation.startsWith(q.answer === 0 ? '正確' : '錯誤'))).toEqual(
      [],
    )
  })

  // Single-choice explanations must name the keyed option, or the key is likely wrong.
  it('single-choice explanations mention the correct option', () => {
    const sc = qs.filter(
      (q): q is Extract<Question, { type: 'single_choice' }> => q.type === 'single_choice',
    )
    // These correct options are sentences; their explanations paraphrase them. Batch 3's
    // keys were checked by Human on the draft, which marked each correct option.
    const paraphrased = ['bio-01-q03', 'bio-01-q11']
    for (const n of [
      36, 37, 39, 40, 41, 42, 44, 46, 47, 50, 51, 53, 54, 55, 58, 59, 61, 62, 64, 65,
    ])
      paraphrased.push(`bio-01-q${n}`)
    const named = sc.filter((q) => !paraphrased.includes(q.id))
    expect(named.filter((q) => !q.explanation.includes(q.options[q.answer]!))).toEqual([])
  })

  // Human removed ATP from stage 1 (not in 國中 108 curriculum); the quiz must not test it.
  // Other untaught terms are caught by Human review, not here (review S4).
  it('does not test ATP', () => {
    expect(JSON.stringify(qs)).not.toContain('ATP')
  })

  // Review S2: an ordering question written in answer order answers itself if not shuffled.
  it('ordering options are not authored in answer order', () => {
    const ord = qs.filter((q) => q.type === 'ordering')
    expect(ord.filter((q) => q.answer.every((v, i) => v === i))).toEqual([])
  })

  // Human-confirmed mapping (docs/audit/v1.1-learning-foundation-audit.md §4.2): the
  // v1.1 mastery numbers rest on it, so any change must go back through Human review.
  it('links each question to the confirmed knowledge points', () => {
    expect(Object.fromEntries(qs.map((q) => [q.id, q.knowledgeIds]))).toEqual({
      'bio-01-q01': ['a-response'],
      'bio-01-q02': ['a-metabolism'],
      'bio-01-q03': ['a-metabolism'],
      'bio-01-q04': ['b-cytoplasm'],
      'bio-01-q05': ['b-nucleus', 'b-membrane', 'b-cytoplasm', 'b-wall'],
      'bio-01-q06': ['b-mitochondrion'],
      'bio-01-q07': ['b-nucleus', 'b-cytoplasm', 'b-vacuole', 'b-wall'],
      'bio-01-q08': ['b-mitochondrion', 'b-chloroplast'],
      'bio-01-q09': ['c-plant', 'c-animal'],
      'bio-01-q10': ['b-chloroplast', 'c-plant'],
      'bio-01-q11': ['c-plant', 'c-both'],
      'bio-01-q12': ['b-mitochondrion', 'c-both'],
      // v1.1 step 6, batch 1 (Human confirmed 2026-11-10): the four points that had no questions.
      'bio-01-q13': ['a-growth'],
      'bio-01-q14': ['a-growth'],
      'bio-01-q15': ['a-growth'],
      'bio-01-q16': ['a-reproduction'],
      'bio-01-q17': ['a-reproduction'],
      'bio-01-q18': ['a-reproduction'],
      'bio-01-q19': ['a-heredity'],
      'bio-01-q20': ['a-heredity', 'b-nucleus'],
      'bio-01-q21': ['a-heredity'],
      'bio-01-q22': ['a-adaptation'],
      'bio-01-q23': ['a-adaptation'],
      'bio-01-q24': ['a-adaptation'],
      // Batch 2 (Human confirmed 2026-11-11): the rest of the points up to 3 questions each.
      'bio-01-q25': ['a-metabolism'],
      'bio-01-q26': ['a-response'],
      'bio-01-q27': ['a-response'],
      'bio-01-q28': ['b-membrane'],
      'bio-01-q29': ['b-membrane', 'c-animal'],
      'bio-01-q30': ['b-chloroplast'],
      'bio-01-q31': ['b-vacuole'],
      'bio-01-q32': ['b-vacuole', 'c-plant'],
      'bio-01-q33': ['b-wall'],
      'bio-01-q34': ['c-animal', 'b-wall'],
      'bio-01-q35': ['c-both'],
      // Batch 3, unit A (Human confirmed 2026-11-11): harder questions, every unit A point up to 8.
      'bio-01-q36': ['a-growth'],
      'bio-01-q37': ['a-growth'],
      'bio-01-q38': ['a-growth'],
      'bio-01-q39': ['a-growth'],
      'bio-01-q40': ['a-growth'],
      'bio-01-q41': ['a-metabolism'],
      'bio-01-q42': ['a-metabolism'],
      'bio-01-q43': ['a-metabolism'],
      'bio-01-q44': ['a-metabolism'],
      'bio-01-q45': ['a-metabolism'],
      'bio-01-q46': ['a-response'],
      'bio-01-q47': ['a-response'],
      'bio-01-q48': ['a-response'],
      'bio-01-q49': ['a-response'],
      'bio-01-q50': ['a-response'],
      'bio-01-q51': ['a-reproduction'],
      'bio-01-q52': ['a-reproduction'],
      'bio-01-q53': ['a-reproduction'],
      'bio-01-q54': ['a-reproduction', 'a-growth'],
      'bio-01-q55': ['a-reproduction'],
      'bio-01-q56': ['a-heredity', 'b-nucleus'],
      'bio-01-q57': ['a-heredity'],
      'bio-01-q58': ['a-heredity'],
      'bio-01-q59': ['a-heredity'],
      'bio-01-q60': ['a-heredity'],
      'bio-01-q61': ['a-adaptation'],
      'bio-01-q62': ['a-adaptation', 'a-response'],
      'bio-01-q63': ['a-adaptation'],
      'bio-01-q64': ['a-adaptation'],
      'bio-01-q65': ['a-adaptation'],
    })
  })

  // Audit §8 step 6: every stage-1 knowledge point has at least 3 questions.
  it('gives every knowledge point at least 3 questions', () => {
    const points = getLessonData('bio-01')!.lessons.flatMap((l) => l.knowledgePoints)
    const thin = points.filter((p) => qs.filter((q) => q.knowledgeIds.includes(p.id)).length < 3)
    expect(thin.map((p) => p.id)).toEqual([])
  })

  // Batch 3's keys, as Human confirmed them on the draft (2026-11-11). Their explanations
  // paraphrase the correct option, so the check above can't catch a wrong key; changing a
  // key here needs Human review again.
  it('keeps the Human-confirmed keys of batch 3', () => {
    const keys = Object.fromEntries(
      qs
        .filter((q) => {
          const n = Number(q.id.replace('bio-01-q', ''))
          return n >= 36 && n <= 65
        })
        .map((q) => [q.id, q.answer]),
    )
    expect(keys).toEqual({
      'bio-01-q36': 2,
      'bio-01-q37': 1,
      'bio-01-q38': 0,
      'bio-01-q39': 3,
      'bio-01-q40': 0,
      'bio-01-q41': 3,
      'bio-01-q42': 0,
      'bio-01-q43': 1,
      'bio-01-q44': 2,
      'bio-01-q45': [1, 0, 2, 3],
      'bio-01-q46': 1,
      'bio-01-q47': 2,
      'bio-01-q48': 0,
      'bio-01-q49': 1,
      'bio-01-q50': 3,
      'bio-01-q51': 0,
      'bio-01-q52': 0,
      'bio-01-q53': 3,
      'bio-01-q54': 0,
      'bio-01-q55': 2,
      'bio-01-q56': 1,
      'bio-01-q57': 1,
      'bio-01-q58': 2,
      'bio-01-q59': 1,
      'bio-01-q60': 0,
      'bio-01-q61': 3,
      'bio-01-q62': 0,
      'bio-01-q63': 1,
      'bio-01-q64': 3,
      'bio-01-q65': 0,
    })
  })

  it('has no bank for a stage without questions', () => {
    expect(getQuestionBank('bio-02')).toBeUndefined()
  })
})
