/** Question bank types (TASK-010; spec.txt FR-05, §8.2). */

export const QUESTION_TYPES = ['single_choice', 'true_false', 'matching', 'ordering'] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Fixed options of a true/false question; `answer` is 0 (對) or 1 (錯). */
export const TRUE_FALSE_OPTIONS = ['對', '錯'] as const

interface QuestionBase {
  /** Unique across all courses, e.g. "bio-01-q01": the wrong-answer book keys on it. */
  id: string
  courseId: string
  /** 知識點分類, e.g. "細胞器功能". */
  topic: string
  /**
   * Knowledge point ids from the stage's lesson data (e.g. "b-nucleus"); at least one.
   * v1.1 works out mastery per point, so the mapping is Human-confirmed content.
   */
  knowledgeIds: readonly string[]
  difficulty: Difficulty
  question: string
  /** 詳細解析: why the answer is right (spec §10: every question has one). */
  explanation: string
  /** 來源或教材依據. Never invented (spec §10.4). */
  source: string
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: 'single_choice'
  options: readonly string[]
  /** Index into options. */
  answer: number
}

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true_false'
  options: [(typeof TRUE_FALSE_OPTIONS)[0], (typeof TRUE_FALSE_OPTIONS)[1]]
  answer: 0 | 1
}

export interface MatchingQuestion extends QuestionBase {
  type: 'matching'
  /** One-to-one: left and right have the same length, no extra distractors. */
  options: { readonly left: readonly string[]; readonly right: readonly string[] }
  /** answer[i] is the index in `right` that belongs with left[i]. */
  answer: readonly number[]
}

export interface OrderingQuestion extends QuestionBase {
  type: 'ordering'
  /** Items as authored; the quiz shuffles them for display. */
  options: readonly string[]
  /** Option indices in the correct order. */
  answer: readonly number[]
}

export type Question =
  SingleChoiceQuestion | TrueFalseQuestion | MatchingQuestion | OrderingQuestion

/** A question that failed validation; `message` is shown to whoever maintains the data. */
export interface QuestionDataError {
  /** Position in the bank file, 0-based. */
  index: number
  /** The question's id, when it has a usable one. */
  id?: string
  message: string
}

/**
 * Questions are the imported JSON objects, shared by every quiz attempt: copy before
 * shuffling or reordering (the readonly types enforce this at compile time).
 */
export interface QuestionBank {
  /** Valid questions only; invalid ones are left out and reported in `errors`. */
  questions: Question[]
  errors: QuestionDataError[]
}
