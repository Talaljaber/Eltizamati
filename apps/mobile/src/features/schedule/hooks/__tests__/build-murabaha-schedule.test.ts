import { Money, toLocalDate } from '@eltizamati/domain'
import { buildMurabahaSchedule } from '../use-murabaha-schedule-view-model'

const jod = (v: string) => Money.of(v, 'JOD')

describe('buildMurabahaSchedule', () => {
  it('produces one row per term month with the fixed installment', () => {
    const rows = buildMurabahaSchedule(jod('3450'), jod('143.75'), 24, toLocalDate('2025-01-01'))
    expect(rows).toHaveLength(24)
    expect(rows.every((r) => r.installment.equals(jod('143.75')))).toBe(true)
    expect(rows.every((r) => !r.isFinalAdjusted)).toBe(true)
  })

  it('clears the outstanding to exactly zero (INV-7, no rounding drift)', () => {
    const rows = buildMurabahaSchedule(jod('14400'), jod('400'), 36, toLocalDate('2024-06-01'))
    const total = rows.reduce((sum, r) => sum.add(r.installment), Money.zero('JOD'))
    expect(total.equals(jod('14400'))).toBe(true)
    expect(rows[rows.length - 1]?.remainingFinancing.isZero()).toBe(true)
  })

  it('advances the installment date one month per period', () => {
    const rows = buildMurabahaSchedule(jod('1200'), jod('100'), 12, toLocalDate('2025-01-15'))
    expect(rows[0]?.date).toBe('2025-02-15')
    expect(rows[11]?.date).toBe('2026-01-15')
  })

  it('adjusts the final installment when installment x term overshoots the sale price', () => {
    // 100 * 12 = 1200 > 1150 → last installment absorbs the 50 difference downward
    const rows = buildMurabahaSchedule(jod('1150'), jod('100'), 12, toLocalDate('2025-01-01'))
    const last = rows[rows.length - 1]
    expect(last?.installment.equals(jod('50'))).toBe(true)
    expect(last?.isFinalAdjusted).toBe(true)
    expect(last?.remainingFinancing.isZero()).toBe(true)
    const total = rows.reduce((sum, r) => sum.add(r.installment), Money.zero('JOD'))
    expect(total.equals(jod('1150'))).toBe(true)
  })

  it('stops early and clears when the contract is over-funded before term end', () => {
    // 500 * 3 = 1500 > 1000 → cleared during period 2, no zero-payment trailing rows
    const rows = buildMurabahaSchedule(jod('1000'), jod('500'), 6, toLocalDate('2025-01-01'))
    expect(rows).toHaveLength(2)
    expect(rows[1]?.remainingFinancing.isZero()).toBe(true)
  })

  it('makes the final installment absorb an under-funded contract remainder', () => {
    // 100 * 12 = 1200 < 1250 → final installment is larger to clear the sale price
    const rows = buildMurabahaSchedule(jod('1250'), jod('100'), 12, toLocalDate('2025-01-01'))
    const last = rows[rows.length - 1]
    expect(last?.installment.equals(jod('150'))).toBe(true)
    expect(last?.isFinalAdjusted).toBe(true)
    expect(last?.remainingFinancing.isZero()).toBe(true)
  })
})
