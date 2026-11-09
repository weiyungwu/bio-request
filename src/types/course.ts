export interface Course {
  /** Stable id used by lessons, questions and progress, e.g. "bio-01". */
  id: string
  order: number
  /** Curriculum topic, e.g. "生命與細胞". */
  theme: string
  /** Adventure mission name shown to students, e.g. "微觀世界探險隊". */
  title: string
  /** Core knowledge points. */
  summary: string
}
