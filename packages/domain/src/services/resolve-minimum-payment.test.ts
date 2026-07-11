/**
 * Credit-card minimum-payment variants (domain-model.md §3.4).
 */
import { describe, it, expect } from 'vitest'
import { resolveMinimumPaymentDue } from './resolve-minimum-payment.js'
import { Money } from '../value-objects/money.js'
import { Percentage } from '../value-objects/percentage.js'

describe('resolveMinimumPaymentDue', () => {
  it('fixed: returns the fixed amount regardless of balance', () => {
    const result = resolveMinimumPaymentDue(
      { type: 'fixed', value: Money.of('25') },
      Money.of('2350'),
    )
    expect(result.kind).toBe('known')
    if (result.kind === 'known') expect(result.amount.toStorageString()).toBe('25')
  })

  it('percent: computes percent of balance when above the floor', () => {
    const result = resolveMinimumPaymentDue(
      { type: 'percent', value: Percentage.of('3'), floor: Money.of('10') },
      Money.of('2350'),
    )
    expect(result.kind).toBe('known')
    if (result.kind === 'known') expect(result.amount.toStorageString()).toBe('70.5')
  })

  it('percent: applies the floor when the percentage would compute below it', () => {
    const result = resolveMinimumPaymentDue(
      { type: 'percent', value: Percentage.of('3'), floor: Money.of('10') },
      Money.of('100'),
    )
    expect(result.kind).toBe('known')
    if (result.kind === 'known') expect(result.amount.toStorageString()).toBe('10')
  })

  it('percent: works without a floor', () => {
    const result = resolveMinimumPaymentDue(
      { type: 'percent', value: Percentage.of('5') },
      Money.of('1000'),
    )
    expect(result.kind).toBe('known')
    if (result.kind === 'known') expect(result.amount.toStorageString()).toBe('50')
  })

  it('BR-CALC-016: unknown card rule is not converted to zero', () => {
    const result = resolveMinimumPaymentDue({ type: 'unknown' }, Money.of('2350'))
    expect(result.kind).toBe('unknown')
    expect(result).not.toHaveProperty('amount')
  })
})
