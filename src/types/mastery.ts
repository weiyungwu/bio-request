/** v1.1 SPEC §4.4. Worked out from learning events on demand; never stored. */
export type MasteryLevel = 'not_started' | 'learning' | 'practicing' | 'mastered'

export interface KnowledgeMastery {
  playerId: string
  knowledgeId: string
  totalAttempts: number
  correctAttempts: number
  wrongAttempts: number
  /** correct / total, 0 with no attempts. */
  accuracy: number
  masteryLevel: MasteryLevel
  lastAttemptAt?: string
  lastCorrectAt?: string
  updatedAt: string
}
