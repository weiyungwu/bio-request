import { describe, it, expect } from 'vitest'
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
    // q03's and q11's correct options are sentences; their explanations paraphrase them.
    const named = sc.filter((q) => !['bio-01-q03', 'bio-01-q11'].includes(q.id))
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

  it('has no bank for a stage without questions', () => {
    expect(getQuestionBank('bio-02')).toBeUndefined()
  })
})
