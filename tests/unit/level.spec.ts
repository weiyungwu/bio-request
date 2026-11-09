import { describe, it, expect } from 'vitest'
import { LEVELS, levelFromExp } from '@/utils/level'

// Level = learning participation (docs/progression.md §1, §5).
// Thresholds are cumulative EXP; each level needs more EXP than the last.
describe('LEVELS table', () => {
  it('matches the agreed 10-level design', () => {
    expect(LEVELS.map((l) => [l.level, l.title, l.minExp])).toEqual([
      [1, '生物新手', 0],
      [2, '初級探索員', 100],
      [3, '細胞見習生', 250],
      [4, '細胞探索員', 450],
      [5, '生物研究員', 700],
      [6, '生物專家', 1000],
      [7, '生命觀察家', 1400],
      [8, '進階研究員', 1900],
      [9, '生物大師', 2500],
      [10, '傳奇探索者', 3200],
    ])
  })

  it('requires strictly more EXP for each successive level-up', () => {
    const gaps = LEVELS.slice(1).map((l, i) => l.minExp - LEVELS[i]!.minExp)
    gaps.slice(1).forEach((gap, i) => expect(gap).toBeGreaterThan(gaps[i]!))
  })
})

describe('levelFromExp', () => {
  it('starts a new student at Lv.1 生物新手, 100 EXP from Lv.2', () => {
    expect(levelFromExp(0)).toEqual({
      level: 1,
      title: '生物新手',
      exp: 0,
      levelMinExp: 0,
      nextLevelMinExp: 100,
      expToNext: 100,
    })
  })

  // The example from the design: 520 EXP -> Lv.4, 180 EXP short of Lv.5.
  it('places 520 EXP at Lv.4 細胞探索員, 180 EXP from Lv.5', () => {
    expect(levelFromExp(520)).toEqual({
      level: 4,
      title: '細胞探索員',
      exp: 520,
      levelMinExp: 450,
      nextLevelMinExp: 700,
      expToNext: 180,
    })
  })

  it('levels up exactly at each threshold', () => {
    expect(levelFromExp(99).level).toBe(1)
    expect(levelFromExp(100).level).toBe(2)
    expect(levelFromExp(249).level).toBe(2)
    expect(levelFromExp(250).level).toBe(3)
  })

  it('caps at Lv.10 with no next level', () => {
    for (const exp of [3200, 9999]) {
      expect(levelFromExp(exp)).toMatchObject({
        level: 10,
        title: '傳奇探索者',
        nextLevelMinExp: null,
        expToNext: null,
      })
    }
  })

  // Corrupted or tampered storage must not produce a broken level.
  it('treats negative or non-finite EXP as 0', () => {
    expect(levelFromExp(-30)).toMatchObject({ level: 1, exp: 0 })
    expect(levelFromExp(Number.NaN)).toMatchObject({ level: 1, exp: 0 })
    expect(levelFromExp(Number.POSITIVE_INFINITY)).toMatchObject({ level: 1, exp: 0 })
  })

  // Fractional EXP never shows as "99.5 EXP"; it rounds down, so no early level-up.
  it('floors fractional EXP', () => {
    expect(levelFromExp(99.5)).toMatchObject({ level: 1, exp: 99, expToNext: 1 })
  })
})
