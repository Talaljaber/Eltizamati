/**
 * TV-30x — the demo seed loan the judges will actually see
 * (calculation-test-vectors.md family TV-3xx). All numeric expectations in
 * this family are `PENDING-FINANCE`; these tests assert the structural
 * claims the vector table itself makes and exercise the engine against the
 * real `packages/demo-data` fixture — never a hand-rolled substitute.
 */
import { describe, expect, it } from 'vitest'
import { buildDemoLoan, DEMO_DATE } from '@eltizamati/demo-data'
import type { Money } from '@eltizamati/domain'
import { computeVariableProjection } from './variable-projection.js'
import { computeResidualDetection } from './residual-detection.js'
import { loadVectorFamily, type RawVector } from '../test-support/load-vectors.js'

const vectors = loadVectorFamily('tv-3xx-demo-seed.json')
const loan = buildDemoLoan(DEMO_DATE)

function findVector(id: string): RawVector {
  const v = vectors.find((x) => x.id === id)
  if (v === undefined)
    throw new Error(/* eslint-disable-line no-restricted-syntax */ `vector ${id} not found`)
  return v
}

function projectDemoLoan() {
  return computeVariableProjection(
    loan.loanDetails.originalPrincipal.value,
    loan.loanDetails.ratePeriods,
    loan.loanDetails.termMonths.value,
    loan.loanDetails.startDate,
    loan.loanDetails.installment.value,
    { kind: 'unchanged' }, // demo seed: "installment unchanged" across the reprice
    DEMO_DATE,
  )
}

describe('TV-301 — outstanding balance at month 30 (estimate)', () => {
  it('reports a defined, positive outstanding balance as of the demo date', () => {
    const projection = projectDemoLoan()
    expect(projection.outstandingAsOf).toBeDefined()
    expect(projection.outstandingAsOf?.isPositive()).toBe(true)
    // 30 months elapsed of an 84-month term — outstanding must be strictly
    // less than original principal (real amortization occurred) and
    // strictly more than zero (nowhere near payoff).
    expect(projection.outstandingAsOf?.isLessThan(loan.loanDetails.originalPrincipal.value)).toBe(
      true,
    )
  })
})

describe('TV-302 — projected residual at maturity exceeds the detection threshold', () => {
  it('fires residualDetection.v1 with cause rateIncreaseWithUnchangedInstallment', () => {
    const projection = projectDemoLoan()
    expect(projection.projectedResidualAtMaturity.isPositive()).toBe(true)

    const detection = computeResidualDetection(
      projection.projectedResidualAtMaturity,
      loan.loanDetails.originalPrincipal.value,
      loan.loanDetails.installment.value,
      { rateIncreasedWithUnchangedInstallment: true },
      DEMO_DATE,
    )
    expect(detection.hasResidualRisk).toBe(true)
    expect(detection.causes).toContain('rateIncreaseWithUnchangedInstallment')
  })
})

describe('TV-303 — old vs new period principal share at the unchanged installment', () => {
  it('the post-reprice period reduces less principal than the pre-reprice period', () => {
    const vector = findVector('TV-303')
    expect(vector.formulaId).toBe('variableProjection')

    const projection = projectDemoLoan()
    // Rate change is effective month 15 (periods 1-14 at 7.5%, 15+ at 9.25%).
    const periodBefore = projection.schedule.find((e) => e.period === 14)
    const periodAfter = projection.schedule.find((e) => e.period === 15)
    expect(periodBefore).toBeDefined()
    expect(periodAfter).toBeDefined()
    expect(periodAfter?.principal.isLessThan(periodBefore?.principal as Money)).toBe(true)
  })
})

describe('TV-305 — repricing added cost vs a hypothetical no-reprice schedule', () => {
  it('the actual (repriced) schedule costs more than a hypothetical flat-rate schedule', () => {
    const projection = projectDemoLoan()

    // Hypothetical: rate never changed — single rate period at the original 7.5%.
    const flatRatePeriod = loan.loanDetails.ratePeriods[0]
    expect(flatRatePeriod).toBeDefined()
    const hypothetical = computeVariableProjection(
      loan.loanDetails.originalPrincipal.value,
      flatRatePeriod !== undefined ? [flatRatePeriod] : [],
      loan.loanDetails.termMonths.value,
      loan.loanDetails.startDate,
      loan.loanDetails.installment.value,
      { kind: 'unchanged' },
      DEMO_DATE,
    )

    expect(projection.totals.totalCost.isGreaterThan(hypothetical.totals.totalCost)).toBe(true)
  })
})
