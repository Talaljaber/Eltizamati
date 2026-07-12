/**
 * INV-3 (financial-calculation-spec.md §8) — under identical assumptions, a
 * strictly higher payment never lengthens payoff nor increases total cost.
 * Fixed CI seed documented below.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { Money, brandId } from '@eltizamati/domain'
import { computeAmortizationSchedule } from '../formulas/amortization.js'
import { computeExtraPaymentScenario } from '../formulas/extra-payment-scenario.js'
import {
  arbitraryPrincipal,
  arbitraryRate,
  arbitraryStartDate,
  arbitraryTermMonths,
} from '../test-support/arbitraries.js'

const FIXED_SEED = 424242

function arbitraryExtraMonthly() {
  return fc.integer({ min: 0, max: 500_000 }).map((fils) => {
    const whole = Math.floor(fils / 1000)
    const frac = fils % 1000
    return Money.of(`${String(whole)}.${String(frac).padStart(3, '0')}`, 'JOD')
  })
}

describe('INV-3 — more payment never worsens payoff', () => {
  it('holds across the generator space for both installment policies', () => {
    fc.assert(
      fc.property(
        arbitraryPrincipal(),
        arbitraryRate(),
        arbitraryTermMonths(),
        arbitraryStartDate(),
        arbitraryExtraMonthly(),
        fc.constantFrom('unchanged', 'recalculated'),
        (principal, rate, term, startDate, extra, policyKind) => {
          const obligationId = brandId<'obligation'>('inv3-prop-obl')
          const ratePeriod = {
            id: brandId<'ratePeriod'>('inv3-prop-rp'),
            obligationId,
            annualRate: rate,
            effectiveFrom: startDate,
            provenance: {
              source: 'userEntered' as const,
              providerId: 'manual',
              observedAt: '2026-01-01T00:00:00.000Z',
              recordedAt: '2026-01-01T00:00:00.000Z',
            },
            createdAt: '2026-01-01T00:00:00.000Z',
          }
          const installment = computeAmortizationSchedule(
            principal,
            rate,
            term,
            startDate,
            startDate,
          ).computedInstallment

          const result = computeExtraPaymentScenario(
            principal,
            [ratePeriod],
            term,
            startDate,
            installment,
            { kind: policyKind },
            startDate,
            extra,
            undefined,
            1,
          )

          expect(result.scenarioPayoffPeriod).toBeLessThanOrEqual(result.basePayoffPeriod)
          expect(result.costSaved.isNegative()).toBe(false)
        },
      ),
      { seed: FIXED_SEED, numRuns: 150 },
    )
  })
})
