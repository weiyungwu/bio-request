/**
 * PROVISIONAL level rule (spec does not define one; TASK-015 owns the final rule):
 * every EXP_PER_LEVEL EXP is one level, starting at Lv 1.
 */
export const EXP_PER_LEVEL = 100

export interface LevelInfo {
  level: number
  expIntoLevel: number
  expForNextLevel: number
}

export function levelFromExp(exp: number): LevelInfo {
  const safeExp = Number.isFinite(exp) && exp > 0 ? Math.floor(exp) : 0
  return {
    level: Math.floor(safeExp / EXP_PER_LEVEL) + 1,
    expIntoLevel: safeExp % EXP_PER_LEVEL,
    expForNextLevel: EXP_PER_LEVEL,
  }
}
