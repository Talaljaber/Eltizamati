import { describe, expect, it } from 'vitest'
import {
  evaluateRateIncreased,
  evaluateInstallmentUnchangedAfterIncrease,
  evaluateResidualRisk,
  computeVariableProjection,
  computeResidualDetection,
} from '@eltizamati/finance-engine'
import { DEMO_DATE } from './constants.js'
import { buildDemoLoan, buildDemoInsights, DEMO_IDS } from './builders.js'

describe('buildDemoInsights', () => {
  it('derives real triggerHash/params from the finance-engine evaluators, not hardcoded strings', () => {
    const insights = buildDemoInsights(DEMO_DATE)
    const loan = buildDemoLoan(DEMO_DATE)
    const ratePeriods = loan.loanDetails.ratePeriods

    const rateIncreased = insights.find((i) => i.ruleId === 'RATE_INCREASED')
    const installmentUnchanged = insights.find(
      (i) => i.ruleId === 'INSTALLMENT_UNCHANGED_AFTER_INCREASE',
    )
    const residualRisk = insights.find((i) => i.ruleId === 'RESIDUAL_RISK')

    expect(rateIncreased).toBeDefined()
    expect(installmentUnchanged).toBeDefined()
    expect(residualRisk).toBeDefined()

    const expectedRateIncreased = evaluateRateIncreased(loan.id, ratePeriods)
    const lastRateIncreased = expectedRateIncreased[expectedRateIncreased.length - 1]
    expect(lastRateIncreased).toBeDefined()
    expect(rateIncreased?.triggerHash).toBe(lastRateIncreased?.triggerHash)
    expect(rateIncreased?.params).toEqual(lastRateIncreased?.params)

    const expectedInstallmentUnchanged = evaluateInstallmentUnchangedAfterIncrease(
      loan.id,
      ratePeriods,
      true,
    )
    const lastInstallmentUnchanged =
      expectedInstallmentUnchanged[expectedInstallmentUnchanged.length - 1]
    expect(lastInstallmentUnchanged).toBeDefined()
    expect(installmentUnchanged?.triggerHash).toBe(lastInstallmentUnchanged?.triggerHash)

    const projection = computeVariableProjection(
      loan.loanDetails.originalPrincipal.value,
      ratePeriods,
      loan.loanDetails.termMonths.value,
      loan.loanDetails.startDate,
      loan.loanDetails.installment.value,
      { kind: 'unchanged' },
      DEMO_DATE,
    )
    const detection = computeResidualDetection(
      projection.projectedResidualAtMaturity,
      loan.loanDetails.originalPrincipal.value,
      loan.loanDetails.installment.value,
      { rateIncreasedWithUnchangedInstallment: true },
      DEMO_DATE,
    )
    // Real numbers for the seeded demo loan genuinely produce residual risk
    // (7.5% -> 9.25% reprice with an unchanged 310 JOD installment causes
    // negative amortization pressure) — this is not fabricated.
    expect(detection.hasResidualRisk).toBe(true)

    const expectedResidualRisk = evaluateResidualRisk(loan.id, detection)
    const lastResidualRisk = expectedResidualRisk[expectedResidualRisk.length - 1]
    expect(lastResidualRisk).toBeDefined()
    expect(residualRisk?.triggerHash).toBe(lastResidualRisk?.triggerHash)
    expect(residualRisk?.params).toEqual(lastResidualRisk?.params)
  })

  it('produces stable, deterministic ids matching DEMO_IDS', () => {
    const insights = buildDemoInsights(DEMO_DATE)
    expect(insights.map((i) => i.id).sort()).toEqual(
      [DEMO_IDS.insightRateIncreasedId, DEMO_IDS.insightInstallmentId, DEMO_IDS.insightResidualId]
        .slice()
        .sort(),
    )
  })

  it('is deterministic across repeated calls', () => {
    const a = buildDemoInsights(DEMO_DATE)
    const b = buildDemoInsights(DEMO_DATE)
    expect(a).toEqual(b)
  })
})
