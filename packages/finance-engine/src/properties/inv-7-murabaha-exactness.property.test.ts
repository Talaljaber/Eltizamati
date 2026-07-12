/**
 * INV-7 (financial-calculation-spec.md §8) — Murabaha: displayed outstanding
 * + Σ payments = totalSalePrice exactly (subtraction only, no rounding
 * drift permitted). Fixed CI seed documented below.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { toLocalDate } from '@eltizamati/domain'
import { computeMurabahaProgress } from '../formulas/murabaha-progress.js'
import { arbitraryPrincipal } from '../test-support/arbitraries.js'

const FIXED_SEED = 424242
const asOf = toLocalDate('2026-07-01')

describe('INV-7 — outstanding + paid = totalSalePrice exactly', () => {
  it('holds for any payments total between 0 and totalSalePrice', () => {
    fc.assert(
      fc.property(
        arbitraryPrincipal(),
        fc.integer({ min: 0, max: 1_000_000 }), // milli-fraction of totalSalePrice paid
        (totalSalePrice, milliFraction) => {
          const fraction = (milliFraction / 1_000_000).toFixed(6)
          const paymentsTotal = totalSalePrice.multiplyBy(fraction).round()

          const result = computeMurabahaProgress(totalSalePrice, paymentsTotal, asOf)

          expect(result.outstanding.add(result.paidToDate).equals(totalSalePrice)).toBe(true)
          expect(result.outstanding.isNegative()).toBe(false)
        },
      ),
      { seed: FIXED_SEED, numRuns: 1000, endOnFailure: false },
    )
  })
})
