import { describe, expect, it } from 'vitest'
import { estimateTax, provinces } from './tax'

// Rows from CRA's 2024 monthly payroll tax tables (T4032, January 2024, claim code 1), linked in VERIFIED_SOURCES.md.
// [province, which tax, monthly pay from, monthly pay to, monthly tax]. All below $68,500 a year, where payroll tables
// and the tax return agree (above it the tables skip the CPP2 deduction).
type CraRow = [string, 'federal' | 'provincial', number, number, number]
const craRows: CraRow[] = [
  ['ON', 'federal', 2500, 2518, 136.15],
  ['ON', 'federal', 4140, 4174, 364.55],
  ['ON', 'provincial', 2493, 2511, 90.45],
  ['ON', 'provincial', 4155, 4189, 193.40],
  ['BC', 'federal', 3494, 3528, 275.05],
  ['BC', 'federal', 5496, 5548, 599.05],
  ['BC', 'provincial', 2496, 2504, 35.15],
  ['BC', 'provincial', 3494, 3528, 112.00],
  ['BC', 'provincial', 5468, 5520, 243.05],
  ['AB', 'provincial', 2496, 2514, 50.85],
  ['AB', 'provincial', 4500, 4534, 236.75],
  ['AB', 'provincial', 5456, 5508, 326.20],
  ['NS', 'provincial', 1486, 1504, 38.86],
  ['NS', 'provincial', 2474, 2508, 121.96],
  ['NS', 'provincial', 4466, 4518, 416.97],
  ['NS', 'provincial', 5454, 5506, 571.40],
  ['QC', 'federal', 2490, 2508, 110.80],
  ['QC', 'federal', 4488, 4522, 341.45],
  ['QC', 'federal', 5452, 5504, 488.95],
]

/**
 * Purpose:
 *	Turn a CRA monthly table row into the yearly income and yearly tax it stands for. CRA computes each row at its midpoint.
 *
 * Args:
 *	- from: the row's lowest monthly pay
 *	- to: the row's highest monthly pay
 *	- monthlyTax: the tax deducted each month for claim code 1
 *
 * Returns:
 *	object: income (yearly pay in dollars) and tax (yearly tax in dollars)
 */
function craAnnual(from: number, to: number, monthlyTax: number) {
  return { income: ((from + to) / 2) * 12, tax: monthlyTax * 12 }
}

describe('estimateTax', () => {
  it.each(craRows)('matches CRA tables: %s %s tax on $%i-$%i a month', (province, kind, from, to, monthlyTax) => {
    const { income, tax } = craAnnual(from, to, monthlyTax)
    expect(Math.abs(estimateTax(income, province)[kind] - tax)).toBeLessThanOrEqual(3)
  })

  it('matches the hand-worked $75,000 Ontario example', () => {
    expect(estimateTax(75_000, 'ON').federal).toBe(8_920)
  })

  it('returns zero tax for zero, negative or missing income', () => {
    for (const income of [0, -5_000, NaN]) {
      expect(estimateTax(income, 'ON')).toEqual({ federal: 0, provincial: 0, total: 0, effectiveRate: 0 })
    }
  })

  it('charges no federal tax below the basic personal amount', () => {
    expect(estimateTax(15_000, 'ON').federal).toBe(0)
  })

  it('throws for an unknown province code', () => {
    expect(() => estimateTax(50_000, 'XX')).toThrow()
  })

  it('never lowers tax when income goes up, in every province', () => {
    for (const province of Object.keys(provinces)) {
      let previous = 0
      for (let income = 0; income <= 600_000; income += 2_500) {
        const { total } = estimateTax(income, province)
        expect(total).toBeGreaterThanOrEqual(previous)
        previous = total
      }
    }
  })

  it('has no jump at a federal bracket boundary', () => {
    const below = estimateTax(55_867, 'AB').federal
    const above = estimateTax(55_868, 'AB').federal
    expect(above - below).toBeLessThanOrEqual(1)
  })

  it('gives the same federal tax everywhere except Quebec, which gets 16.5% off', () => {
    const federal = estimateTax(90_000, 'ON').federal
    for (const province of Object.keys(provinces).filter((code) => code !== 'QC')) {
      expect(estimateTax(90_000, province).federal).toBe(federal)
    }
    expect(estimateTax(90_000, 'QC').federal).toBeLessThan(federal)
  })

  it('reports effectiveRate as total tax divided by income', () => {
    const { total, effectiveRate } = estimateTax(120_000, 'BC')
    expect(effectiveRate).toBeCloseTo(total / 120_000, 2)
    expect(effectiveRate).toBeLessThan(0.54)
  })
})
