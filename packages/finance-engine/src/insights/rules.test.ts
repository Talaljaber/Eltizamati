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

  it('handles unsorted rate periods correctly (sort branch coverage)', () => {
    const obligationId = brandId<'obligation'>('rp-sort-obl')
    const provenance = {
      source: 'userEntered' as const,
      providerId: 'manual',
      observedAt: '2026-01-01T00:00:00.000Z',
      recordedAt: '2026-01-01T00:00:00.000Z',
    }
    const ratePeriods: readonly RatePeriod[] = [
      {
        id: brandId('rp-2'),
        obligationId,
        annualRate: Rate.fromPercent('8'),
        effectiveFrom: toLocalDate('2026-06-01'), // Later
        provenance,
        createdAt: provenance.recordedAt,
      },
      {
        id: brandId('rp-3'),
        obligationId,
        annualRate: Rate.fromPercent('8'),
        effectiveFrom: toLocalDate('2026-06-01'), // Same time (branch 0 coverage)
        provenance,
        createdAt: provenance.recordedAt,
      },
      {
        id: brandId('rp-1'),
        obligationId,
        annualRate: Rate.fromPercent('5'),
        effectiveFrom: toLocalDate('2026-01-01'), // Earlier
        provenance,
        createdAt: provenance.recordedAt,
      },
    ]
    const candidates = evaluateRateIncreased(obligationId, ratePeriods)
    // The sorting should place rp-1 first, then rp-2/rp-3
    // It should detect the increase from 5% to 8%
    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.ruleId).toBe('RATE_INCREASED')
    expect(candidates[0]?.params?.fromRate).toBe('5.00')
    expect(candidates[0]?.params?.toRate).toBe('8.00')
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
      Money.of('500', 'JOD'),
      {},
      toLocalDate('2026-01-01'),
    )
    const risk = evaluateResidualRisk(loan.id, detection)
    expect(risk).toHaveLength(1)
    expect(risk[0]?.ruleId).toBe('RESIDUAL_RISK')
    expect(risk[0]?.params?.residualAmount).toBe('1,500.000') // formatted JOD
  })

  it('does not fire when residual is zero', () => {
    const detection = computeResidualDetection(
      Money.zero('JOD'),
      Money.of('20000', 'JOD'),
      Money.of('500', 'JOD'),
      {},
      toLocalDate('2026-01-01'),
    )
    const noRisk = evaluateResidualRisk(loan.id, detection)
    expect(noRisk).toHaveLength(0)
  })
})
