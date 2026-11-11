export interface StoryCharacter {
  id: string
  name: string
  /** Emoji placeholder until character art exists. */
  avatar: string
}

export interface StoryLine {
  /** StoryCharacter id */
  speaker: string
  text: string
}

export interface Story {
  /** Mission name, e.g. "細胞城市大搜查" (spec.txt 5.1). */
  title: string
  characters: StoryCharacter[]
  /** At least one line. */
  lines: [StoryLine, ...StoryLine[]]
  /** Mission objectives shown on the mission card (spec.txt FR-02). */
  objectives: string[]
}

export interface LessonImage {
  /** Path under public/, e.g. "/images/cells/plant-cell.svg". */
  src: string
  alt: string
  /** Explains the image in text; the image itself must not be the only carrier of meaning. */
  caption: string
}

/** One knowledge card; fields per spec.txt FR-03. */
export interface KnowledgePoint {
  id: string
  /** 正式學科名詞 */
  term: { zh: string; en: string }
  /** 正式定義 */
  definition: string
  /** 白話解釋 */
  plain: string
  /** 生活化例子 */
  example: string
  /** 考試重點提示 */
  examTip: string
  /** 圖片或示意圖 (optional; see docs/known-issues.md). Two images are shown side by side for comparison. */
  images?: LessonImage[]
  /** Decorative emoji when there are no images. */
  icon?: string
}

/** A teaching unit (spec.txt 8.1 `lessons[]`; 8.1's unused `content` omitted). */
export interface Lesson {
  id: string
  title: string
  knowledgePoints: KnowledgePoint[]
}

/** Cell explorer (TASK-007): structures to find before moving on (FR-02 mission). */
export interface ExplorerConfig {
  /** KnowledgePoint ids, e.g. "b-nucleus". */
  targets: string[]
}

/** One structure–function pair in the matching game (TASK-008, spec.txt 5.3 遊戲二). */
export interface MatchingPair {
  /** KnowledgePoint id; its term is the structure name and its definition the explanation. */
  pointId: string
  /** Function shown as a choice. Must not contain the structure name. */
  function: string
  /** Shown when this structure is paired with the wrong function. */
  hint: string
}

export interface MatchingConfig {
  pairs: MatchingPair[]
}

/** Answer buckets in the classification game (TASK-009, spec.txt 5.3 遊戲三). */
export type CellCategory = 'plant' | 'animal' | 'both'

export interface ClassificationItem {
  /** KnowledgePoint id; its term is the structure shown. */
  pointId: string
  category: CellCategory
  /** Why it belongs there (FR-04: explain, not just 對/錯). Shown after every answer. */
  explanation: string
}

export interface ClassificationConfig {
  items: ClassificationItem[]
}

/**
 * Part of a long lesson (上篇／下篇) that students may start from. Human decision (2026-11-11):
 * stage 1 grew to 23 points, so students choose where to start; reading progress is not saved.
 */
export interface LessonPart {
  /** Short name, e.g. "上篇". */
  name: string
  title: string
  /** Lesson (unit) ids in reading order. Together, the parts cover every unit once, in order. */
  lessonIds: string[]
}

/** Per-course lesson file: src/data/lessons/<courseId>.json. */
export interface LessonData {
  courseId: string
  story: Story
  lessons: Lesson[]
  /** Optional; without parts the lesson is read in one go. */
  parts?: LessonPart[]
  explorer: ExplorerConfig
  matching: MatchingConfig
  classification: ClassificationConfig
}
