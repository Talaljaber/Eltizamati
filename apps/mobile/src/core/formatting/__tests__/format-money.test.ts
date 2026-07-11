/**
 * format-money tests — pure unit tests, no RN dependencies (DS-4).
 *
 * Uses real Money.of() from @eltizamati/domain.
 * These functions are the single source of truth for monetary display
 * (system-architecture.md §7; AI_AGENT_RULES §5).
 */
import { Money } from '@eltizamati/domain'
import { formatMoneyOfficial, formatMoneyEstimate } from '../format-money'

// ── formatMoneyOfficial ────────────────────────────────────────────────────────

describe('formatMoneyOfficial', () => {
  it('formats JOD with 3 decimal places', () => {
    const money = Money.of('1500.750', 'JOD')
    expect(formatMoneyOfficial(money, 'JOD')).toBe('1,500.75 JOD')
  })

  it('adds thousands separator for amounts >= 1000', () => {
    const money = Money.of('12345', 'JOD')
    // Money.round() on a whole JOD amount → toFixed() gives "12345"
    // formatMoneyOfficial calls money.round().toStorageString()
    expect(formatMoneyOfficial(money, 'JOD')).toBe('12,345 JOD')
  })

  it('formats large amounts with multiple thousands separators', () => {
    const money = Money.of('1234567.890', 'JOD')
    expect(formatMoneyOfficial(money, 'JOD')).toBe('1,234,567.89 JOD')
  })

  it('formats zero amount', () => {
    const money = Money.zero('JOD')
    expect(formatMoneyOfficial(money, 'JOD')).toBe('0 JOD')
  })

  it('formats amounts less than 1000 without thousands separator', () => {
    const money = Money.of('999.500', 'JOD')
    expect(formatMoneyOfficial(money, 'JOD')).toBe('999.5 JOD')
  })

  it('uses the provided currencyLabel in output', () => {
    const money = Money.of('100', 'JOD')
    expect(formatMoneyOfficial(money, 'دينار')).toContain('دينار')
  })

  it('rounds to JOD precision (3 dp) via Money.round()', () => {
    // 100.1234 → rounds to 100.123 (HALF_UP at 3dp)
    const money = Money.of('100.1234', 'JOD')
    expect(formatMoneyOfficial(money, 'JOD')).toBe('100.123 JOD')
  })

  it('handles negative amounts', () => {
    const money = Money.of('-500.250', 'JOD')
    expect(formatMoneyOfficial(money, 'JOD')).toBe('-500.25 JOD')
  })
})

// ── formatMoneyEstimate ────────────────────────────────────────────────────────

describe('formatMoneyEstimate', () => {
  it('prefixes with ≈ (BR-CALC-014)', () => {
    const money = Money.of('1234', 'JOD')
    expect(formatMoneyEstimate(money, 'JOD')).toMatch(/^≈/)
  })

  it('rounds to whole units — no decimal part', () => {
    const money = Money.of('1500.750', 'JOD')
    const result = formatMoneyEstimate(money, 'JOD')
    expect(result).toBe('≈ 1,501 JOD')
  })

  it('rounds down when fractional part < 0.5', () => {
    const money = Money.of('999.400', 'JOD')
    expect(formatMoneyEstimate(money, 'JOD')).toBe('≈ 999 JOD')
  })

  it('rounds up when fractional part >= 0.5 (HALF_UP)', () => {
    const money = Money.of('999.500', 'JOD')
    expect(formatMoneyEstimate(money, 'JOD')).toBe('≈ 1,000 JOD')
  })

  it('adds thousands separator for estimates >= 1000', () => {
    const money = Money.of('12500', 'JOD')
    expect(formatMoneyEstimate(money, 'JOD')).toBe('≈ 12,500 JOD')
  })

  it('formats zero estimate', () => {
    const money = Money.zero('JOD')
    expect(formatMoneyEstimate(money, 'JOD')).toBe('≈ 0 JOD')
  })

  it('uses the provided currencyLabel', () => {
    const money = Money.of('1000', 'JOD')
    expect(formatMoneyEstimate(money, 'دينار')).toContain('دينار')
  })

  it('handles large estimates correctly', () => {
    const money = Money.of('1000000', 'JOD')
    expect(formatMoneyEstimate(money, 'JOD')).toBe('≈ 1,000,000 JOD')
  })
})
