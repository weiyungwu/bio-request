import type { QuestionBank } from '@/types/question'
import { validateQuestionBank } from '@/utils/questionBank'

// Every src/data/questions/<courseId>.json, bundled at build time. The file name is the
// course id; each question's courseId must match it.
const files = import.meta.glob<{ default: unknown }>('./*.json', { eager: true })

const byCourseId = new Map(
  Object.entries(files).map(([path, m]) => {
    const courseId = path.replace(/^\.\/(.+)\.json$/, '$1')
    return [courseId, validateQuestionBank(m.default, courseId)]
  }),
)

/** Validated bank for a course; undefined when the course has no question file. */
export function getQuestionBank(courseId: string): QuestionBank | undefined {
  return byCourseId.get(courseId)
}
