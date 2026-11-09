import type { LessonData } from '@/types/lesson'

// Every src/data/lessons/<courseId>.json, bundled at build time.
const files = import.meta.glob<{ default: LessonData }>('./*.json', { eager: true })

const byCourseId = new Map(Object.values(files).map((m) => [m.default.courseId, m.default]))

export function getLessonData(courseId: string): LessonData | undefined {
  return byCourseId.get(courseId)
}
