/**
 * Level = learning participation, from cumulative EXP (docs/progression.md §1).
 * EXP earning rules and anti-farming caps live elsewhere (TASK-015).
 */
export const LEVELS = [
  { level: 1, title: '生物新手', minExp: 0 },
  { level: 2, title: '初級探索員', minExp: 100 },
  { level: 3, title: '細胞見習生', minExp: 250 },
  { level: 4, title: '細胞探索員', minExp: 450 },
  { level: 5, title: '生物研究員', minExp: 700 },
  { level: 6, title: '生物專家', minExp: 1000 },
  { level: 7, title: '生命觀察家', minExp: 1400 },
  { level: 8, title: '進階研究員', minExp: 1900 },
  { level: 9, title: '生物大師', minExp: 2500 },
  { level: 10, title: '傳奇探索者', minExp: 3200 },
] as const

export interface LevelInfo {
  level: number
  title: string
  /** Total cumulative EXP. */
  exp: number
  levelMinExp: number
  /** null at max level. */
  nextLevelMinExp: number | null
  /** null at max level. */
  expToNext: number | null
}

export function levelFromExp(rawExp: number): LevelInfo {
  const exp = Number.isFinite(rawExp) && rawExp > 0 ? Math.floor(rawExp) : 0
  // LEVELS is ascending by minExp; count thresholds reached. Level 1 (0 EXP) always is.
  const index = LEVELS.filter((l) => exp >= l.minExp).length - 1
  const current = LEVELS[index]!
  const next = LEVELS[index + 1]
  return {
    level: current.level,
    title: current.title,
    exp,
    levelMinExp: current.minExp,
    nextLevelMinExp: next?.minExp ?? null,
    expToNext: next ? next.minExp - exp : null,
  }
}
