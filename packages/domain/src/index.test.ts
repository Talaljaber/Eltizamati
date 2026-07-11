/**
 * Barrel smoke test — the public API surface (AI_AGENT_RULES §2: this is what
 * downstream consumers see and what future agents search before adding a new
 * abstraction). Fails loudly if an export is accidentally dropped.
 */
import { describe, it, expect } from 'vitest'
import * as domain from './index.js'

describe('packages/domain public API', () => {
  it('exports value object constructors', () => {
    expect(domain.Money).toBeDefined()
    expect(domain.Rate).toBeDefined()
    expect(domain.Percentage).toBeDefined()
  })

  it('exports provenance helpers', () => {
    expect(domain.userEntered).toBeDefined()
    expect(domain.demoSourced).toBeDefined()
    expect(domain.engineEstimate).toBeDefined()
    expect(domain.isHigherPriority).toBeDefined()
    expect(domain.isStale).toBeDefined()
  })

  it('exports confidence helpers', () => {
    expect(domain.confidenceRank).toBeDefined()
    expect(domain.weakestConfidence).toBeDefined()
    expect(domain.isAtLeastConfidence).toBeDefined()
  })

  it('exports named threshold constants (no magic numbers)', () => {
    expect(domain.CONV_6_OVERDUE_GRACE_DAYS).toBe(3)
    expect(domain.CONV_7_DUE_SOON_HORIZON_DAYS).toBe(7)
    expect(domain.BR_STAT_003_DELINQUENCY_THRESHOLD_PERIODS).toBe(2)
    expect(domain.CALCULATION_REFUSED_INSIGHT_RULE_ID).toBeTypeOf('string')
  })

  it('exports domain services', () => {
    expect(domain.deriveObligationStatus).toBeDefined()
    expect(domain.validateRatePeriods).toBeDefined()
    expect(domain.validateMurabahaFinancing).toBeDefined()
    expect(domain.validatePaymentAllocation).toBeDefined()
    expect(domain.resolveMinimumPaymentDue).toBeDefined()
    expect(domain.canonicalStringify).toBeDefined()
    expect(domain.hashCanonicalJson).toBeDefined()
  })

  it('exports type guards', () => {
    expect(domain.isConventionalLoan).toBeDefined()
    expect(domain.isMurabaha).toBeDefined()
    expect(domain.isCreditCard).toBeDefined()
  })

  it('exports the error/Result taxonomy', () => {
    expect(domain.makeError).toBeDefined()
    expect(domain.ok).toBeDefined()
    expect(domain.err).toBeDefined()
    expect(domain.isOk).toBeDefined()
    expect(domain.isErr).toBeDefined()
    expect(domain.DomainInvariantError).toBeDefined()
  })
})
