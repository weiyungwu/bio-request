import { describe, it, expect } from 'vitest'
import { shuffle } from '@/utils/shuffle'

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    expect(shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4])
  })

  // Matching choices in the original order would sit beside their own answers.
  it('never returns the input order', () => {
    const identity = () => 0.999999 // j === i every step: Fisher–Yates leaves the order unchanged
    expect(shuffle([1, 2, 3, 4], identity)).not.toEqual([1, 2, 3, 4])
    for (let n = 0; n < 50; n++) expect(shuffle(['a', 'b'])).toEqual(['b', 'a'])
  })

  it('does not modify the input', () => {
    const input = [1, 2, 3]
    shuffle(input)
    expect(input).toEqual([1, 2, 3])
  })
})
