/**
 * INV-5 (financial-calculation-spec.md §8) — determinism: identical
 * canonical inputs ⇒ byte-identical results, hash-verified via
 * `hashCanonicalJson` (the same reproducibility mechanism `CalculationRun`
 * uses for `inputsHash`). Fixed CI seed documented below.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  brandId,
  hashCanonicalJson,
  toLocalDate,
  type CanonicalJsonValue,
} from '@eltizamati/domain'
import { computeAmortizationSchedule } from '../formulas/amortization.js'
import { computeVariableProjection } from '../formulas/variable-projection.js'
import { computeMurabahaProgress } from '../formulas/murabaha-progress.js'
import {
  arbitraryPrincipal,
  arbitraryRate,
  arbitraryStartDate,
  arbitraryTermMonths,
} from '../test-support/arbitraries.js'
import { canonicalJsonStringOf } from '../test-support/canonicalize-result.js'

const FIXED_SEED = 424242

describe('INV-5 — determinism (amortization.v1)', () => {
  it('identical inputs produce byte-identical, hash-identical results across repeated runs', () => {
    fc.assert(
      fc.property(
        arbitraryPrincipal(),
        arbitraryRate(),
        arbitraryTermMonths(),
        arbitraryStartDate(),
        (principal, rate, term, startDate) => {
          const runA = computeAmortizationSchedule(principal, rate, term, startDate, startDate)
          const runB = computeAmortizationSchedule(principal, rate, term, startDate, startDate)

          const jsonA = canonicalJsonStringOf(runA)
          const jsonB = canonicalJsonStringOf(runB)
          expect(jsonA).toBe(jsonB)

          const hashA = hashCanonicalJson(JSON.parse(jsonA) as CanonicalJsonValue)
          const hashB = hashCanonicalJson(JSON.parse(jsonB) as CanonicalJsonValue)
          expect(hashA).toBe(hashB)
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000, endOnFailure: false },
    )
  })
})

describe('INV-5 — determinism (variableProjection.v1)', () => {
  it('identical inputs produce byte-identical, hash-identical results across repeated runs', () => {
    fc.assert(
      fc.property(
        arbitraryPrincipal(),
        arbitraryRate(),
        arbitraryTermMonths(),
        arbitraryStartDate(),
        (principal, rate, term, startDate) => {
          const obligationId = brandId<'obligation'>('det-obl')
          const ratePeriod = {
            id: brandId<'ratePeriod'>('det-rp'),
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

          const runA = computeVariableProjection(
            principal,
            [ratePeriod],
            term,
            startDate,
            installment,
            { kind: 'unchanged' },
            startDate,
          )
          const runB = computeVariableProjection(
            principal,
            [ratePeriod],
            term,
            startDate,
            installment,
            { kind: 'unchanged' },
            startDate,
          )

          expect(canonicalJsonStringOf(runA)).toBe(canonicalJsonStringOf(runB))
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000, endOnFailure: false },
    )
  })
})

describe('INV-5 — determinism (murabahaProgress.v1)', () => {
  it('identical inputs produce byte-identical results', () => {
    fc.assert(
      fc.property(
        arbitraryPrincipal(),
        fc.integer({ min: 0, max: 1_000_000 }), // milli-fraction of totalSalePrice paid — never exceeds it
        (totalSalePrice, milliFraction) => {
          const fraction = (milliFraction / 1_000_000).toFixed(6)
          const paymentsTotal = totalSalePrice.multiplyBy(fraction).round()
          const asOf = toLocalDate('2026-07-01')
          const runA = computeMurabahaProgress(totalSalePrice, paymentsTotal, asOf)
          const runB = computeMurabahaProgress(totalSalePrice, paymentsTotal, asOf)
          expect(canonicalJsonStringOf(runA)).toBe(canonicalJsonStringOf(runB))
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000, endOnFailure: false },
    )
  })
})
