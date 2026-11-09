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

/** Per-course lesson file: src/data/lessons/<courseId>.json. */
export interface LessonData {
  courseId: string
  story: Story
  lessons: Lesson[]
  explorer: ExplorerConfig
}
