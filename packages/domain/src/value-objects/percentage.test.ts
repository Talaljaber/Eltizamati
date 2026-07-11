/**
 * Percentage VO tests — precision + boundary validation (PHASE-02-DECISION-LOG.md §1).
 */
import { describe, it, expect } from 'vitest'
import { Percentage } from './percentage.js'

describe('Percentage', () => {
  describe('construction', () => {
    it('constructs from decimal string without precision loss', () => {
      expect(Percentage.of('3.256').toStorageString()).toBe('3.256')
    })

    it('Percentage.zero is zero', () => {
      expect(Percentage.zero().isZero()).toBe(true)
    })

    it('rejects unsafe floating-point number input', () => {
      expect(() => Percentage.of(3.5)).toThrow('unsafe floating-point number')
    })

    it('accepts safe-integer number input', () => {
      expect(Percentage.of(70).toStorageString()).toBe('70')
    })

    it('rejects negative values', () => {
      expect(() => Percentage.of('-1')).toThrow('must be non-negative')
    })

    it('rejects values beyond the sanity bound', () => {
      expect(() => Percentage.of('1001')).toThrow('exceeds sanity bound')
    })

    it('accepts over-100 values (e.g. over-limit utilization)', () => {
      expect(Percentage.of('142.5').toStorageString()).toBe('142.5')
    })
  })

  describe('toDecimalFraction', () => {
    it('converts 3.5% to the fraction 0.035', () => {
      expect(Percentage.of('3.5').toDecimalFraction().toFixed(3)).toBe('0.035')
    })
  })

  describe('comparisons', () => {
    it('equals', () => {
      expect(Percentage.of('70').equals(Percentage.of('70'))).toBe(true)
    })

    it('isGreaterThan / isLessThan', () => {
      expect(Percentage.of('70').isGreaterThan(Percentage.of('50'))).toBe(true)
      expect(Percentage.of('50').isLessThan(Percentage.of('70'))).toBe(true)
    })
  })
})
