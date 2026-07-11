import { describe, it, expect } from 'vitest'
import { toLocalDate } from './id.js'
import {
  addMonthsToLocalDate,
  addDaysToLocalDate,
  compareLocalDate,
  daysBetweenLocalDates,
  isAfterLocalDate,
  isBeforeLocalDate,
} from './local-date-math.js'

describe('local-date-math', () => {
  it('addMonthsToLocalDate adds whole months', () => {
    expect(addMonthsToLocalDate(toLocalDate('2026-01-15'), 1)).toBe('2026-02-15')
    expect(addMonthsToLocalDate(toLocalDate('2026-01-15'), 12)).toBe('2027-01-15')
  })

  it('addMonthsToLocalDate clamps day to the target month length', () => {
    expect(addMonthsToLocalDate(toLocalDate('2026-01-31'), 1)).toBe('2026-02-28')
    expect(addMonthsToLocalDate(toLocalDate('2024-01-31'), 1)).toBe('2024-02-29') // leap year
  })

  it('addDaysToLocalDate crosses month/year boundaries', () => {
    expect(addDaysToLocalDate(toLocalDate('2026-01-30'), 3)).toBe('2026-02-02')
    expect(addDaysToLocalDate(toLocalDate('2026-12-30'), 5)).toBe('2027-01-04')
  })

  it('compareLocalDate / isBeforeLocalDate / isAfterLocalDate', () => {
    const a = toLocalDate('2026-01-01')
    const b = toLocalDate('2026-02-01')
    expect(compareLocalDate(a, b)).toBeLessThan(0)
    expect(isBeforeLocalDate(a, b)).toBe(true)
    expect(isAfterLocalDate(b, a)).toBe(true)
    expect(compareLocalDate(a, a)).toBe(0)
  })

  it('daysBetweenLocalDates', () => {
    expect(daysBetweenLocalDates(toLocalDate('2026-01-01'), toLocalDate('2026-01-11'))).toBe(10)
    expect(daysBetweenLocalDates(toLocalDate('2026-01-11'), toLocalDate('2026-01-01'))).toBe(-10)
  })
})
