/**
 * INV-1, INV-2, INV-6 (financial-calculation-spec.md §8) — property tests
 * over the fixed CI seed documented below. Re-run with an unfixed seed
 * locally via `PROPERTY_SEED=<n> pnpm test` (see the `seed` override at the
 * bottom of each `fc.assert` call) to search for new counterexamples;
 * minimized failures should be committed as new fixed vectors (the doc's
 * "ratchet" policy).
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { conv5PerPeriodTolerance, conv5PerScheduleTolerance, brandId } from '@eltizamati/domain'
import { computeAmortizationSchedule } from '../formulas/amortization.js'
import { computeVariableProjection } from '../formulas/variable-projection.js'
import {
  arbitraryPrincipal,
  arbitraryRate,
  arbitraryStartDate,
  arbitraryTermMonths,
} from '../test-support/arbitraries.js'
import { assertPropertyChunked } from '../test-support/assert-property-chunked.js'

const FIXED_SEED = 424242 // documented CI seed — do not change without recording why

describe('INV-1 — balances never negative; schedules never contain negative payments', () => {
  it('holds for amortization.v1 across the generator space', async () => {
    await assertPropertyChunked(
      fc.property(
        arbitraryPrincipal(),
        arbitraryRate(),
        arbitraryTermMonths(),
        arbitraryStartDate(),
        (principal, rate, term, startDate) => {
          const result = computeAmortizationSchedule(principal, rate, term, startDate, startDate)
          for (const entry of result.schedule) {
            expect(entry.payment.isNegative()).toBe(false)
            expect(entry.closingBalance.isNegative()).toBe(false)
          }
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000 },
    )
  })

  it('holds for variableProjection.v1 (unchanged policy — where negative amortization can grow balance, but never below zero)', async () => {
    await assertPropertyChunked(
      fc.property(
        arbitraryPrincipal(),
        arbitraryRate(),
        arbitraryTermMonths(),
        arbitraryStartDate(),
        (principal, rate, term, startDate) => {
          const obligationId = brandId<'obligation'>('prop-obl')
          const ratePeriod = {
            id: brandId<'ratePeriod'>('prop-rp'),
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
          // A minimal, always-sufficient installment (equal to the level
          // payment) guarantees no early-payoff edge case obscures the
          // negative-balance check across the whole random space.
          const installment = computeAmortizationSchedule(
            principal,
            rate,
            term,
            startDate,
            startDate,
          ).computedInstallment

          const result = computeVariableProjection(
            principal,
            [ratePeriod],
            term,
            startDate,
            installment,
            { kind: 'unchanged' },
            startDate,
          )
          for (const entry of result.schedule) {
            expect(entry.closingBalance.isNegative()).toBe(false)
          }
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000 },
    )
  })
})

describe('INV-2 — per period: principal + cost = payment within CONV-5 tolerance', () => {
  it('holds for amortization.v1', async () => {
    await assertPropertyChunked(
      fc.property(
        arbitraryPrincipal(),
        arbitraryRate(),
        arbitraryTermMonths(),
        arbitraryStartDate(),
        (principal, rate, term, startDate) => {
          const result = computeAmortizationSchedule(principal, rate, term, startDate, startDate)
          const tolerance = conv5PerPeriodTolerance(principal.currency)
          for (const entry of result.schedule) {
            const diff = entry.principal.add(entry.cost).subtract(entry.payment).abs()
            expect(diff.isGreaterThan(tolerance)).toBe(false)
          }
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000 },
    )
  })
})

describe('INV-6 — sum of schedule principal = original principal (± CONV-5 schedule tolerance) for closing schedules', () => {
  it('holds for amortization.v1 (always closes by construction — BR-CALC-008)', async () => {
    await assertPropertyChunked(
      fc.property(
        arbitraryPrincipal(),
        arbitraryRate(),
        arbitraryTermMonths(),
        arbitraryStartDate(),
        (principal, rate, term, startDate) => {
          const result = computeAmortizationSchedule(principal, rate, term, startDate, startDate)
          const diff = result.totals.totalPrincipal.subtract(principal).abs()
          const tolerance = conv5PerScheduleTolerance(principal.currency)
          expect(diff.isGreaterThan(tolerance)).toBe(false)
          // BR-CALC-008: the schedule closes to exactly zero, always.
          const finalEntry = result.schedule[result.schedule.length - 1]
          expect(finalEntry?.closingBalance.isZero()).toBe(true)
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000 },
    )
  })

  it('holds for variableProjection.v1 under `recalculated` (guaranteed to close)', async () => {
    await assertPropertyChunked(
      fc.property(
        arbitraryPrincipal(),
        arbitraryRate(),
        arbitraryTermMonths(),
        arbitraryStartDate(),
        (principal, rate, term, startDate) => {
          const obligationId = brandId<'obligation'>('prop-obl-2')
          const ratePeriod = {
            id: brandId<'ratePeriod'>('prop-rp-2'),
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

          const result = computeVariableProjection(
            principal,
            [ratePeriod],
            term,
            startDate,
            installment,
            { kind: 'recalculated' },
            startDate,
          )
          expect(result.projectedResidualAtMaturity.isZero()).toBe(true)
          const diff = result.totals.totalPrincipal.subtract(principal).abs()
          const tolerance = conv5PerScheduleTolerance(principal.currency)
          expect(diff.isGreaterThan(tolerance)).toBe(false)
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000 },
    )
  })
})
