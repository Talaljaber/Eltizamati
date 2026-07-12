import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { Money, toLocalDate } from '@eltizamati/domain'
import { computeMurabahaProgress, murabahaProgress } from './murabaha-progress.js'
import { isEngineOk, isRefused } from '../refusal.js'
import { loadVectorFamily } from '../test-support/load-vectors.js'

const vectors = loadVectorFamily('tv-5xx-murabaha-progress.json')
const asOf = toLocalDate('2026-07-01')

describe('murabahaProgress.v1 — analytical vectors', () => {
  it('TV-501: demo seed progress, INV-7 exactness', () => {
    const vector = vectors.find((v) => v.id === 'TV-501')
    if (vector === undefined)
      throw new Error(/* eslint-disable-line no-restricted-syntax */ 'vector missing')
    const inputs = vector.inputs as { totalSalePrice: string; paymentsTotal: string }
    const expected = vector.expected as {
      paidToDate: string
      outstanding: string
      progressPercent2dp: string
    }

    const totalSalePrice = Money.of(inputs.totalSalePrice, 'JOD')
    const paymentsTotal = Money.of(inputs.paymentsTotal, 'JOD')
    const result = computeMurabahaProgress(totalSalePrice, paymentsTotal, asOf)

    expect(result.paidToDate.equals(Money.of(expected.paidToDate, 'JOD'))).toBe(true)
    expect(result.outstanding.equals(Money.of(expected.outstanding, 'JOD'))).toBe(true)

    // INV-7: outstanding + paid = totalSalePrice exactly (no rounding drift).
    expect(result.outstanding.add(result.paidToDate).equals(totalSalePrice)).toBe(true)

    const progressRounded = new Decimal(result.progress.toStorageString()).toDecimalPlaces(
      2,
      Decimal.ROUND_HALF_UP,
    )
    expect(progressRounded.toFixed(2)).toBe(expected.progressPercent2dp)
    expect(result.status).toBe('inProgress')
  })

  it('TV-502: completed financing', () => {
    const vector = vectors.find((v) => v.id === 'TV-502')
    if (vector === undefined)
      throw new Error(/* eslint-disable-line no-restricted-syntax */ 'vector missing')
    const inputs = vector.inputs as { totalSalePrice: string; paymentsTotal: string }
    const expected = vector.expected as { outstanding: string; status: string }

    const result = computeMurabahaProgress(
      Money.of(inputs.totalSalePrice, 'JOD'),
      Money.of(inputs.paymentsTotal, 'JOD'),
      asOf,
    )

    expect(result.outstanding.equals(Money.of(expected.outstanding, 'JOD'))).toBe(true)
    expect(result.status).toBe(expected.status)
  })
})

describe('murabahaProgress.v1 — INV-7 property (arbitrary payment sums)', () => {
  it('outstanding + paid always equals totalSalePrice exactly, for any paid amount up to the total', () => {
    const totalSalePrice = Money.of('18600', 'JOD')
    for (const paid of ['0', '1', '6820', '9300.500', '18599.999', '18600']) {
      const result = computeMurabahaProgress(totalSalePrice, Money.of(paid, 'JOD'), asOf)
      expect(result.outstanding.add(result.paidToDate).equals(totalSalePrice)).toBe(true)
    }
  })
})

describe('murabahaProgress — engine refusal (BR-CALC-016)', () => {
  it('refuses when totalSalePrice is missing', () => {
    const outcome = murabahaProgress({ paymentsTotal: Money.of('100', 'JOD'), asOf })
    expect(isRefused(outcome)).toBe(true)
  })

  it('refuses when paymentsTotal is missing', () => {
    const outcome = murabahaProgress({ totalSalePrice: Money.of('18600', 'JOD'), asOf })
    expect(isRefused(outcome)).toBe(true)
  })

  it('succeeds with high confidence when both inputs are present', () => {
    const outcome = murabahaProgress({
      totalSalePrice: Money.of('18600', 'JOD'),
      paymentsTotal: Money.of('6820', 'JOD'),
      asOf,
    })
    expect(isEngineOk(outcome)).toBe(true)
    if (isEngineOk(outcome)) {
      expect(outcome.confidence).toBe('high')
    }
  })
})
