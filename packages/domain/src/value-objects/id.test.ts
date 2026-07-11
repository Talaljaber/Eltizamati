import { describe, it, expect } from 'vitest'
import { brandId, toLocalDate, localDateFromDate } from './id.js'

describe('brandId', () => {
  it('brands a non-empty string', () => {
    expect(brandId<'obligation'>('obl-1')).toBe('obl-1')
  })

  it('rejects an empty string', () => {
    expect(() => brandId('')).toThrow('non-empty string')
  })
})

describe('toLocalDate / localDateFromDate', () => {
  it('accepts a valid ISO date', () => {
    expect(toLocalDate('2026-07-01')).toBe('2026-07-01')
  })

  it('rejects a malformed date string', () => {
    expect(() => toLocalDate('07/01/2026')).toThrow('Invalid LocalDate')
  })

  it('localDateFromDate derives the UTC calendar date', () => {
    expect(localDateFromDate(new Date('2026-07-01T12:00:00.000Z'))).toBe('2026-07-01')
  })
})
