import { describe, it, expect } from 'vitest'
import { EXP_PER_LEVEL, levelFromExp } from '@/utils/level'

// Home shows "Lv N" and an EXP bar toward the next level. A new student
// (no data) must start at Lv 1 with an empty bar, never Lv 0 or NaN.
describe('levelFromExp', () => {
  it('starts a new student at Lv 1 with 0 EXP into the level', () => {
    expect(levelFromExp(0)).toEqual({ level: 1, expIntoLevel: 0, expForNextLevel: EXP_PER_LEVEL })
  })

  it('levels up exactly at each threshold', () => {
    expect(levelFromExp(EXP_PER_LEVEL - 1).level).toBe(1)
    expect(levelFromExp(EXP_PER_LEVEL)).toEqual({
      level: 2,
      expIntoLevel: 0,
      expForNextLevel: EXP_PER_LEVEL,
    })
    expect(levelFromExp(EXP_PER_LEVEL * 2 + 50)).toMatchObject({ level: 3, expIntoLevel: 50 })
  })

  // Corrupted or tampered storage must not produce a broken level.
  it('treats negative or non-finite EXP as 0', () => {
    expect(levelFromExp(-30)).toMatchObject({ level: 1, expIntoLevel: 0 })
    expect(levelFromExp(Number.NaN)).toMatchObject({ level: 1, expIntoLevel: 0 })
  })
})
