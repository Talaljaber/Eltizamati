/**
 * BR-OBL-003: assetCost + disclosedProfit = totalSalePrice within CONV-5 tolerance.
 */
import { describe, it, expect } from 'vitest'
import { validateMurabahaFinancing } from './validate-murabaha.js'
import { Money } from '../value-objects/money.js'
import { toLocalDate } from '../value-objects/id.js'
import type { MurabahaDetails } from '../entities/obligation.js'

function sourced<T>(value: T) {
  return {
    value,
    provenance: { source: 'demo' as const, observedAt: '2026-01-01', recordedAt: '2026-01-01' },
  }
}

function details(
  assetCost: string,
  disclosedProfit: string,
  totalSalePrice: string,
): MurabahaDetails {
  return {
    assetCost: sourced(Money.of(assetCost)),
    disclosedProfit: sourced(Money.of(disclosedProfit)),
    totalSalePrice: sourced(Money.of(totalSalePrice)),
    installment: sourced(Money.of('221.4286')),
    termMonths: sourced(84),
    startDate: toLocalDate('2024-01-15'),
  }
}

describe('validateMurabahaFinancing', () => {
  it('BR-OBL-003: accepts an exact assetCost + disclosedProfit = totalSalePrice', () => {
    const result = validateMurabahaFinancing(details('15000', '3600', '18600'))
    expect(result.ok).toBe(true)
  })

  it('BR-OBL-003: rejects inconsistent Murabaha sale price', () => {
    const result = validateMurabahaFinancing(details('15000', '3600', '19000'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('validation')
      expect(result.error.safeMetadata?.['reason']).toBe('BR-OBL-003')
    }
  })

  it('BR-OBL-003: accepts a difference within the CONV-5 rounding tolerance (0.005 JOD)', () => {
    const result = validateMurabahaFinancing(details('15000', '3600.004', '18600'))
    expect(result.ok).toBe(true)
  })

  it('BR-OBL-003: rejects a difference just beyond the CONV-5 rounding tolerance', () => {
    const result = validateMurabahaFinancing(details('15000', '3600.006', '18600'))
    expect(result.ok).toBe(false)
  })
})
