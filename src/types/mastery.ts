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
  /**
   * Share right among the latest MASTERY_RULES.recentWindow answers, the window mastery is
   * judged on; 0 with no attempts. Not in the §4.4 interface: added so "weak" means weak now.
   */
  recentAccuracy: number
  /** How many answers `recentAccuracy` is over (the latest, up to recentWindow), and how many
   * of them were right: the counts a reason quotes (SPEC v1.1 §20 5.4). Not in §4.4 either. */
  recentAttempts: number
  recentCorrect: number
  masteryLevel: MasteryLevel
  lastAttemptAt?: string
  lastCorrectAt?: string
  updatedAt: string
}
