import { getLessonData } from '@/data/lessons'
import type { QuestionBank } from '@/types/question'
import { validateQuestionBank } from '@/utils/questionBank'

// Every src/data/questions/<courseId>.json, bundled at build time. The file name is the
// course id; each question's courseId must match it, and its knowledgeIds must be
// knowledge points of that course's lessons (no lesson data: one file-level error).
const files = import.meta.glob<{ default: unknown }>('./*.json', { eager: true })

const byCourseId = new Map(
  Object.entries(files).map(([path, m]) => {
    const courseId = path.replace(/^\.\/(.+)\.json$/, '$1')
    const lesson = getLessonData(courseId)
    // `?? []`: lesson JSON is cast, not validated; a unit without points must not throw here,
    // which would break every stage's quiz at module load.
    const points =
      lesson && new Set(lesson.lessons.flatMap((l) => (l.knowledgePoints ?? []).map((p) => p.id)))
    return [courseId, validateQuestionBank(m.default, courseId, points)]
  }),
)

/** Validated bank for a course; undefined when the course has no question file. */
export function getQuestionBank(courseId: string): QuestionBank | undefined {
  return byCourseId.get(courseId)
}
