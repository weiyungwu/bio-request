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
  lines: StoryLine[]
  /** Mission objectives shown on the mission card (spec.txt FR-02). */
  objectives: string[]
}

/** Per-course lesson file: src/data/lessons/<courseId>.json. Lessons are added in TASK-006. */
export interface LessonData {
  courseId: string
  story: Story
}
