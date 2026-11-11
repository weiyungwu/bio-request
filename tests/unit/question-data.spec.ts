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
    // keys were checked by Human on the draft, which marked each correct option (q66, q70,
    // q79, q85, q90 are Human's own wording) and are pinned below.
    const paraphrased = ['bio-01-q03', 'bio-01-q11']
    for (const n of [
      36, 37, 39, 40, 41, 44, 46, 47, 50, 51, 54, 58, 61, 62, 64, 65, 66, 70, 79, 85, 90,
    ])
      paraphrased.push(`bio-01-q${n}`)
    const named = sc.filter((q) => !paraphrased.includes(q.id))
    expect(named.filter((q) => !q.explanation.includes(q.options[q.answer]!))).toEqual([])
  })

  // Human decision (2026-11-11): the stage follows the school textbook (新文京《生物學》
  // ch. 1), not the 國中 curriculum, so questions may go beyond 國中 terms (ATP was banned
  // before) — but only once the lesson teaches them. Only listed terms are checked: add
  // each new term a batch relies on. Scenario names and distractors (傘藻, 內質網) may stay
  // untaught; other terms are caught by Human review, not here (review S4).
  it('only uses extended terms the lesson teaches', () => {
    const lesson = JSON.stringify(getLessonData('bio-01')!.lessons)
    const terms = [
      'ATP',
      '脂質',
      '選擇性通透',
      '滲透',
      '纖維素',
      '裸胞',
      '原核生物',
      '膜狀胞器',
      '感覺神經',
      '運動神經',
      '脊髓',
      '胺基酸',
      '蛋白質',
      '葡萄糖',
      '二氧化碳',
      'RNA',
      '轉錄',
    ]
    const used = terms.filter((t) => JSON.stringify(qs).includes(t))
    expect(used.filter((t) => !lesson.includes(t))).toEqual([])
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
      // Batch 3, unit B (Human confirmed 2026-11-11): every unit B point up to 8.
      'bio-01-q66': ['b-nucleus'],
      'bio-01-q67': ['b-nucleus', 'b-cytoplasm'],
      'bio-01-q68': ['b-nucleus'],
      'bio-01-q69': ['b-nucleus'],
      'bio-01-q70': ['b-membrane', 'b-wall'],
      'bio-01-q71': ['b-membrane'],
      'bio-01-q72': ['b-membrane', 'b-wall'],
      'bio-01-q73': ['b-membrane'],
      'bio-01-q74': ['b-membrane', 'c-both'],
      'bio-01-q75': ['b-cytoplasm', 'b-chloroplast'],
      'bio-01-q76': ['b-cytoplasm'],
      'bio-01-q77': ['b-cytoplasm'],
      'bio-01-q78': ['b-cytoplasm'],
      'bio-01-q79': ['b-mitochondrion'],
      'bio-01-q80': ['b-mitochondrion', 'b-chloroplast'],
      'bio-01-q81': ['b-mitochondrion', 'b-chloroplast', 'c-plant'],
      'bio-01-q82': ['b-mitochondrion', 'b-chloroplast'],
      'bio-01-q83': ['b-mitochondrion', 'c-animal'],
      'bio-01-q84': ['b-chloroplast'],
      'bio-01-q85': ['b-vacuole', 'b-wall'],
      'bio-01-q86': ['b-vacuole', 'c-plant'],
      'bio-01-q87': ['b-vacuole'],
      'bio-01-q88': ['b-vacuole'],
      'bio-01-q89': ['b-vacuole', 'b-wall'],
      'bio-01-q90': ['b-wall', 'b-nucleus'],
      'bio-01-q91': ['b-wall'],
      // Batch 3, unit C (Human confirmed 2026-11-11): every stage-1 point at 8 or more.
      'bio-01-q92': ['c-animal', 'c-plant'],
      'bio-01-q93': ['c-animal'],
      'bio-01-q94': ['c-animal', 'b-membrane'],
      'bio-01-q95': ['c-animal', 'b-chloroplast'],
      'bio-01-q96': ['c-both'],
      'bio-01-q97': ['c-both'],
      'bio-01-q98': ['c-both', 'c-plant'],
      'bio-01-q99': ['c-both'],
    })
  })

  // Audit §8 step 6, batch 3 (Human decision 2026-11-11): every stage-1 point has at least
  // 8 questions, so each can reach mastered (5 different questions) with room to spare.
  it('gives every knowledge point enough questions', () => {
    const points = getLessonData('bio-01')!.lessons.flatMap((l) => l.knowledgePoints)
    const thin = points.filter((p) => qs.filter((q) => q.knowledgeIds.includes(p.id)).length < 8)
    expect(thin.map((p) => p.id)).toEqual([])
  })

  // Batch 3's keys (q36–q99), as Human confirmed them on the drafts (2026-11-11). Their explanations
  // paraphrase the correct option, so the check above can't catch a wrong key; changing a
  // key here needs Human review again.
  it('keeps the Human-confirmed keys of batch 3', () => {
    const keys = Object.fromEntries(
      qs
        .filter((q) => {
          const n = Number(q.id.replace('bio-01-q', ''))
          return n >= 36 && n <= 99
        })
        .map((q) => [q.id, q.answer]),
    )
    expect(keys).toEqual({
      'bio-01-q36': 2,
      'bio-01-q37': 1,
      'bio-01-q38': 0,
      'bio-01-q39': 3,
      'bio-01-q40': 0,
      'bio-01-q41': 2,
      'bio-01-q42': 0,
      'bio-01-q43': 1,
      'bio-01-q44': 2,
      'bio-01-q45': [1, 0, 2, 3],
      'bio-01-q46': 1,
      'bio-01-q47': 2,
      'bio-01-q48': 0,
      'bio-01-q49': 1,
      'bio-01-q50': 1,
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
      'bio-01-q66': 1,
      'bio-01-q67': 1,
      'bio-01-q68': 1,
      'bio-01-q69': 3,
      'bio-01-q70': 1,
      'bio-01-q71': 0,
      'bio-01-q72': 0,
      'bio-01-q73': 2,
      'bio-01-q74': 0,
      'bio-01-q75': 2,
      'bio-01-q76': 1,
      'bio-01-q77': 1,
      'bio-01-q78': 3,
      'bio-01-q79': 0,
      'bio-01-q80': 1,
      'bio-01-q81': 1,
      'bio-01-q82': 3,
      'bio-01-q83': 0,
      'bio-01-q84': 0,
      'bio-01-q85': 1,
      'bio-01-q86': 2,
      'bio-01-q87': 0,
      'bio-01-q88': 0,
      'bio-01-q89': 2,
      'bio-01-q90': 2,
      'bio-01-q91': 0,
      'bio-01-q92': 3,
      'bio-01-q93': 0,
      'bio-01-q94': 1,
      'bio-01-q95': 2,
      'bio-01-q96': 1,
      'bio-01-q97': 3,
      'bio-01-q98': 0,
      'bio-01-q99': 0,
    })
  })

  it('has no bank for a stage without questions', () => {
    expect(getQuestionBank('bio-02')).toBeUndefined()
  })
})
