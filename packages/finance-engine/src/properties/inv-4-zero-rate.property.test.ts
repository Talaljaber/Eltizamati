/**
 * INV-4 (financial-calculation-spec.md §8) — zero rate ⇒ zero cost; total
 * paid = principal exactly. Fixed CI seed documented below.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { Rate } from '@eltizamati/domain'
import { computeAmortizationSchedule } from '../formulas/amortization.js'
import {
  arbitraryPrincipal,
  arbitraryStartDate,
  arbitraryTermMonths,
} from '../test-support/arbitraries.js'
import { assertPropertyChunked } from '../test-support/assert-property-chunked.js'

const FIXED_SEED = 424242

describe('INV-4 — zero rate ⇒ zero cost; total paid = principal exactly', () => {
  it('holds for amortization.v1 across arbitrary principal/term at rate = 0', async () => {
    await assertPropertyChunked(
      fc.property(
        arbitraryPrincipal(),
        arbitraryTermMonths(),
        arbitraryStartDate(),
        (principal, term, startDate) => {
          const result = computeAmortizationSchedule(
            principal,
            Rate.fromPercent('0'),
            term,
            startDate,
            startDate,
          )
          expect(result.totals.totalCost.isZero()).toBe(true)
          expect(result.totals.totalPaid.equals(principal)).toBe(true)
          for (const entry of result.schedule) {
            expect(entry.cost.isZero()).toBe(true)
          }
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000 },
    )
  })
})
