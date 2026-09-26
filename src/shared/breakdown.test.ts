import { describe, expect, it } from 'vitest'
import { breakdown, TOTAL_FEDERAL_SPENDING, yourShare } from './breakdown'

describe('breakdown', () => {
  it('has the 7 biggest programs plus "All other programs", biggest first', () => {
    expect(breakdown.items).toHaveLength(8)
    expect(breakdown.items.at(-1)?.name).toBe('All other programs')
    const top = breakdown.items.slice(0, 7).map((item) => item.amount)
    expect(top).toEqual([...top].sort((a, b) => b - a))
  })

  it('adds up to total federal spending', () => {
    const sum = breakdown.items.reduce((total, item) => total + item.amount, 0)
    expect(Math.abs(sum - TOTAL_FEDERAL_SPENDING)).toBeLessThanOrEqual(breakdown.items.length)
    const percents = breakdown.items.reduce((total, item) => total + item.percent, 0)
    expect(Math.abs(percents - 100)).toBeLessThanOrEqual(0.5)
  })

  it('gives every item a plain name and every program a source code', () => {
    for (const item of breakdown.items.slice(0, 7)) {
      expect(item.name).not.toBe(item.official_name)
      expect(item.dept_code && item.program_code).toBeTruthy()
    }
    expect(breakdown.source.url).toMatch(/^https:\/\/open\.canada\.ca\//)
  })
})

describe('yourShare', () => {
  it('splits federal tax in proportion to spending', () => {
    expect(yourShare(10_000, TOTAL_FEDERAL_SPENDING)).toBeCloseTo(10_000)
    expect(yourShare(10_000, TOTAL_FEDERAL_SPENDING / 100)).toBeCloseTo(100)
    expect(yourShare(0, 1_000_000)).toBe(0)
  })
})
