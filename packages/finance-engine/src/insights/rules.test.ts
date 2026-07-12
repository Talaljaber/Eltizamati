import { describe, expect, it } from 'vitest'
import { buildDemoLoan, DEMO_DATE } from '@eltizamati/demo-data'
import { Rate, brandId, toLocalDate, type RatePeriod } from '@eltizamati/domain'
import {
  evaluateInstallmentUnchangedAfterIncrease,
  evaluateRateIncreased,
  evaluateResidualRisk,
} from './rules.js'
import { computeResidualDetection } from '../formulas/residual-detection.js'
import { Money } from '@eltizamati/domain'

const loan = buildDemoLoan(DEMO_DATE)

describe('evaluateRateIncreased', () => {
  it('fires on the demo loan’s real 7.5%→9.25% reprice', () => {
    const candidates = evaluateRateIncreased(loan.id, loan.loanDetails.ratePeriods)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.ruleId).toBe('RATE_INCREASED')
    expect(candidates[0]?.params?.fromRate).toBe('7.50')
    expect(candidates[0]?.params?.toRate).toBe('9.25')
  })

  it('does not fire for a rate decrease', () => {
    const startDate = toLocalDate('2026-01-01')
    const obligationId = brandId<'obligation'>('rp-decrease-obl')
    const provenance = {
      source: 'userEntered' as const,
      providerId: 'manual',
      observedAt: '2026-01-01T00:00:00.000Z',
      recordedAt: '2026-01-01T00:00:00.000Z',
    }
    const ratePeriods: readonly RatePeriod[] = [
      {
        id: brandId('rp-1'),
        obligationId,
        annualRate: Rate.fromPercent('10'),
        effectiveFrom: startDate,
        provenance,
        createdAt: provenance.recordedAt,
      },
      {
        id: brandId('rp-2'),
        obligationId,
        annualRate: Rate.fromPercent('8'),
        effectiveFrom: toLocalDate('2026-06-01'),
        provenance,
        createdAt: provenance.recordedAt,
      },
    ]
    expect(evaluateRateIncreased(obligationId, ratePeriods)).toHaveLength(0)
  })

  it('does not fire for a single rate period (no history to compare)', () => {
    expect(
      evaluateRateIncreased(loan.id, [loan.loanDetails.ratePeriods[0] as RatePeriod]),
    ).toHaveLength(0)
  })

  it('is deterministic — same inputs produce the same triggerHash', () => {
    const a = evaluateRateIncreased(loan.id, loan.loanDetails.ratePeriods)
    const b = evaluateRateIncreased(loan.id, loan.loanDetails.ratePeriods)
    expect(a[0]?.triggerHash).toBe(b[0]?.triggerHash)
  })
})

describe('evaluateInstallmentUnchangedAfterIncrease', () => {
  it('fires only when a rate increase occurred AND the installment stayed the same', () => {
    const fires = evaluateInstallmentUnchangedAfterIncrease(
      loan.id,
      loan.loanDetails.ratePeriods,
      true,
    )
    expect(fires).toHaveLength(1)
    expect(fires[0]?.ruleId).toBe('INSTALLMENT_UNCHANGED_AFTER_INCREASE')
  })

  it('does not fire when the caller reports the installment was recalculated', () => {
    const noFire = evaluateInstallmentUnchangedAfterIncrease(
      loan.id,
      loan.loanDetails.ratePeriods,
      false,
    )
    expect(noFire).toHaveLength(0)
  })

  it('does not fire when there was no rate increase at all', () => {
    const single = evaluateInstallmentUnchangedAfterIncrease(
      loan.id,
      [loan.loanDetails.ratePeriods[0] as RatePeriod],
      true,
    )
    expect(single).toHaveLength(0)
  })
})

describe('evaluateResidualRisk', () => {
  it('fires when residualDetection.v1 flags risk', () => {
    const detection = computeResidualDetection(
      Money.of('1500', 'JOD'),
      Money.of('20000', 'JOD'),
      Money.of('310', 'JOD'),
      { rateIncreasedWithUnchangedInstallment: true },
      DEMO_DATE,
    )
    const candidates = evaluateResidualRisk(loan.id, detection)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.severity).toBe('urgent')
  })

  it('does not fire when there is no residual risk', () => {
    const detection = computeResidualDetection(
      Money.of('50', 'JOD'),
      Money.of('20000', 'JOD'),
      Money.of('310', 'JOD'),
      {},
      DEMO_DATE,
    )
    expect(evaluateResidualRisk(loan.id, detection)).toHaveLength(0)
  })
})

describe('evaluateRateIncreased — sort-stability edge case', () => {
  it('does not throw when two rate periods share the same effectiveFrom', () => {
    const startDate = toLocalDate('2026-01-01')
    const obligationId = brandId<'obligation'>('dup-obl')
    const provenance = {
      source: 'userEntered' as const,
      providerId: 'manual',
      observedAt: '2026-01-01T00:00:00.000Z',
      recordedAt: '2026-01-01T00:00:00.000Z',
    }
    const ratePeriods: readonly RatePeriod[] = [
      {
        id: brandId('dup-rp-1'),
        obligationId,
        annualRate: Rate.fromPercent('8'),
        effectiveFrom: startDate,
        provenance,
        createdAt: provenance.recordedAt,
      },
      {
        id: brandId('dup-rp-2'),
        obligationId,
        annualRate: Rate.fromPercent('9'),
        effectiveFrom: startDate,
        provenance,
        createdAt: provenance.recordedAt,
      },
    ]
    expect(() => evaluateRateIncreased(obligationId, ratePeriods)).not.toThrow()
  })
})
