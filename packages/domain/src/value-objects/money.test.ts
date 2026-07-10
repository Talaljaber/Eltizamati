/**
 * Money VO unit tests — ADR-0011 (Vitest).
 * Naming convention per testing-strategy.md §3: test names cite the rule.
 */
import { describe, it, expect } from 'vitest'
import { Money, Rate } from '../value-objects/money.js'

describe('Money', () => {
  describe('construction', () => {
    it('constructs from decimal string without precision loss', () => {
      const m = Money.of('1234.567', 'JOD')
      expect(m.toStorageString()).toBe('1234.567')
    })

    it('Money.zero produces zero for JOD', () => {
      expect(Money.zero().isZero()).toBe(true)
    })

    it('refuses construction from float literals by design — always use strings', () => {
      // 0.1 + 0.2 in floats = 0.30000000000000004
      // Money.of(0.1).add(Money.of(0.2)) must equal 0.3 exactly
      const result = Money.of('0.1').add(Money.of('0.2'))
      expect(result.toStorageString()).toBe('0.3')
    })
  })

  describe('arithmetic', () => {
    it('add: 12345.678 + 1000.000 = 13345.678 JOD', () => {
      const a = Money.of('12345.678', 'JOD')
      const b = Money.of('1000.000', 'JOD')
      expect(a.add(b).toStorageString()).toBe('13345.678')
    })

    it('subtract: 13345.678 - 1000.000 = 12345.678 JOD', () => {
      const a = Money.of('13345.678', 'JOD')
      const b = Money.of('1000.000', 'JOD')
      expect(a.subtract(b).toStorageString()).toBe('12345.678')
    })

    it('multiplyBy scalar', () => {
      const m = Money.of('1000', 'JOD')
      expect(m.multiplyBy('1.09375').toStorageString()).toBe('1093.75')
    })

    it('throws on currency mismatch', () => {
      const jod = Money.of('100', 'JOD')
      const usd = Money.of('100', 'USD')
      expect(() => jod.add(usd)).toThrow('currency mismatch')
    })

    it('throws on division by zero', () => {
      expect(() => Money.of('100').divideBy(0)).toThrow('division by zero')
    })
  })

  describe('rounding (BR-CALC-003/004)', () => {
    it('round() uses HALF_UP at 3 dp for JOD (ASM-009)', () => {
      // 1234.5675 → rounds up to 1234.568
      expect(Money.of('1234.5675').round().toStorageString()).toBe('1234.568')
    })

    it('roundToWhole() for estimate display (BR-CALC-014)', () => {
      expect(Money.of('1234.567').roundToWhole().toStorageString()).toBe('1235')
    })
  })

  describe('comparisons', () => {
    it('equals', () => {
      expect(Money.of('100.000').equals(Money.of('100.000'))).toBe(true)
    })

    it('isGreaterThan', () => {
      expect(Money.of('200').isGreaterThan(Money.of('100'))).toBe(true)
    })
  })
})

describe('Rate', () => {
  it('fromPercent: 9.25% → internal 0.0925', () => {
    const r = Rate.fromPercent('9.25')
    expect(r.toStorageString()).toBe('0.0925')
  })

  it('periodicRate: 9.25% annual / 12 months', () => {
    const r = Rate.fromPercent('9.25')
    const monthly = r.periodicRate(12)
    // 0.0925 / 12 = 0.007708333...
    expect(monthly.toFixed(9)).toBe('0.007708333')
  })

  it('throws on out-of-range percent', () => {
    expect(() => Rate.fromPercent(-1)).toThrow('out of range')
    expect(() => Rate.fromPercent(101)).toThrow('out of range')
  })

  it('equals', () => {
    expect(Rate.fromPercent('9.25').equals(Rate.fromPercent('9.25'))).toBe(true)
    expect(Rate.fromPercent('9.25').equals(Rate.fromPercent('7.50'))).toBe(false)
  })
})
