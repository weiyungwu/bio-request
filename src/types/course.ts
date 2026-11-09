/** Course (stage) data, field names per spec.txt §8.1. */
export interface Course {
  /** Stable id used by lessons, questions and progress, e.g. "bio-01". */
  id: string
  /** Curriculum topic, e.g. "生命與細胞". */
  title: string
  /** Adventure mission name shown to students, e.g. "微觀世界探險隊". */
  storyTitle: string
  /** Core knowledge, from spec.txt §3. */
  description: string
  order: number
}
