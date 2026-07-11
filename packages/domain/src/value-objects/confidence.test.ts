/**
 * Confidence VO tests (PHASE-02-DECISION-LOG.md §2).
 */
import { describe, it, expect } from 'vitest'
import { confidenceRank, weakestConfidence, isAtLeastConfidence } from './confidence.js'

describe('Confidence', () => {
  it('ranks official highest, low lowest', () => {
    expect(confidenceRank('official')).toBeGreaterThan(confidenceRank('high'))
    expect(confidenceRank('high')).toBeGreaterThan(confidenceRank('medium'))
    expect(confidenceRank('medium')).toBeGreaterThan(confidenceRank('low'))
  })

  it('INV-6 in spirit: composition never upgrades — weakestConfidence picks the lower rank', () => {
    expect(weakestConfidence('high', 'medium')).toBe('medium')
    expect(weakestConfidence('medium', 'high')).toBe('medium')
    expect(weakestConfidence('low', 'official')).toBe('low')
  })

  it('isAtLeastConfidence compares by rank', () => {
    expect(isAtLeastConfidence('high', 'medium')).toBe(true)
    expect(isAtLeastConfidence('medium', 'high')).toBe(false)
    expect(isAtLeastConfidence('official', 'official')).toBe(true)
  })
})
