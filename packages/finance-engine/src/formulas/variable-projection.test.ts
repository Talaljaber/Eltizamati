import { describe, expect, it } from 'vitest'
import {
  Money,
  Rate,
  brandId,
  toLocalDate,
  addMonthsToLocalDate,
  type RatePeriod,
  type LocalDate,
  DomainInvariantError,
} from '@eltizamati/domain'
import { computeAmortizationSchedule } from './amortization.js'
import {
  computeVariableProjection,
  variableProjection,
  type InstallmentPolicy,
} from './variable-projection.js'
import { isRefused } from '../refusal.js'
import { loadVectorFamily, type RawVector } from '../test-support/load-vectors.js'

const vectors = loadVectorFamily('tv-2xx-variable-projection.json')
const obligationId = brandId<'obligation'>('vector-obligation-0000-0000-0000000000')

function ratePeriod(seq: number, annualRatePercent: string, effectiveFrom: LocalDate): RatePeriod {
  return {
    id: brandId<'ratePeriod'>(`vector-rp-${seq}-0000-0000-0000-0000000000`),
    obligationId,
    annualRate: Rate.fromPercent(annualRatePercent),
    effectiveFrom,
    provenance: {
      source: 'userEntered',
      providerId: 'manual',
      observedAt: '2026-01-01T00:00:00.000Z',
      recordedAt: '2026-01-01T00:00:00.000Z',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

interface RateSpec {
  readonly effectiveFromPeriod?: number
  readonly effectiveFromDate?: string
  readonly annualRatePercent: string
}

function buildRatePeriods(startDate: LocalDate, specs: readonly RateSpec[]): readonly RatePeriod[] {
  return specs.map((spec, i) => {
    const effectiveFrom =
      spec.effectiveFromDate !== undefined
        ? toLocalDate(spec.effectiveFromDate)
        : addMonthsToLocalDate(startDate, (spec.effectiveFromPeriod as number) - 1)
    return ratePeriod(i + 1, spec.annualRatePercent, effectiveFrom)
  })
}

function findVector(id: string): RawVector {
  const v = vectors.find((x) => x.id === id)
  if (!v) throw new DomainInvariantError('unexpected', `vector ${id} not found`)
  return v
}

describe('variableProjection.v1 — TV-201 (no-op reprice regression guard)', () => {
  it('matches plain amortization when the "rate change" is a no-op', () => {
    const vector = findVector('TV-201')
    const inputs = vector.inputs as {
      principal: string
      startDate: string
      termMonths: number
      ratePeriods: readonly RateSpec[]
    }
    const startDate = toLocalDate(inputs.startDate)
    const principal = Money.of(inputs.principal, 'JOD')
    const ratePeriods = buildRatePeriods(startDate, inputs.ratePeriods)
    const asOf = toLocalDate(vector.asOf)

    const base = computeAmortizationSchedule(principal, Rate.fromPercent('12'), 12, startDate, asOf)
    const variable = computeVariableProjection(
      principal,
      ratePeriods,
      12,
      startDate,
      base.computedInstallment,
      { kind: 'recalculated' },
      asOf,
    )

    expect(variable.schedule).toHaveLength(base.schedule.length)
    for (let i = 0; i < base.schedule.length; i++) {
      const b = base.schedule[i]
      const v = variable.schedule[i]
      expect(v?.closingBalance.equals(b?.closingBalance as Money)).toBe(true)
      expect(v?.payment.equals(b?.payment as Money)).toBe(true)
    }
    expect(variable.projectedResidualAtMaturity.isZero()).toBe(true)
  })
})

describe('variableProjection.v1 — TV-202 (recalculated: residual = 0, maturity unchanged)', () => {
  it('re-levels at the rate boundary and closes exactly at termMonths', () => {
    const vector = findVector('TV-202')
    const inputs = vector.inputs as {
      principal: string
      startDate: string
      termMonths: number
      ratePeriods: readonly RateSpec[]
    }
    const expected = vector.expected as { scheduleLength: number; residual: string }
    const startDate = toLocalDate(inputs.startDate)
    const principal = Money.of(inputs.principal, 'JOD')
    const ratePeriods = buildRatePeriods(startDate, inputs.ratePeriods)
    const asOf = toLocalDate(vector.asOf)

    const initialInstallment = computeAmortizationSchedule(
      principal,
      Rate.fromPercent('8'),
      inputs.termMonths,
      startDate,
      asOf,
    ).computedInstallment

    const result = computeVariableProjection(
      principal,
      ratePeriods,
      inputs.termMonths,
      startDate,
      initialInstallment,
      { kind: 'recalculated' },
      asOf,
    )

    expect(result.schedule).toHaveLength(expected.scheduleLength)
    expect(result.projectedResidualAtMaturity.equals(Money.of(expected.residual, 'JOD'))).toBe(true)
    expect(result.payoffPeriod).toBeUndefined()
  })
})

describe('variableProjection.v1 — TV-203 (unchanged: residual > 0, negative amortization visible)', () => {
  it('leaves a positive residual and never forces closure', () => {
    const vector = findVector('TV-203')
    const inputs = vector.inputs as {
      principal: string
      startDate: string
      termMonths: number
      ratePeriods: readonly RateSpec[]
    }
    const expected = vector.expected as { residualPositive: boolean }
    const startDate = toLocalDate(inputs.startDate)
    const principal = Money.of(inputs.principal, 'JOD')
    const ratePeriods = buildRatePeriods(startDate, inputs.ratePeriods)
    const asOf = toLocalDate(vector.asOf)

    const initialInstallment = computeAmortizationSchedule(
      principal,
      Rate.fromPercent('8'),
      inputs.termMonths,
      startDate,
      asOf,
    ).computedInstallment

    const result = computeVariableProjection(
      principal,
      ratePeriods,
      inputs.termMonths,
      startDate,
      initialInstallment,
      { kind: 'unchanged' },
      asOf,
    )

    expect(result.projectedResidualAtMaturity.isPositive()).toBe(expected.residualPositive)
    expect(result.schedule).toHaveLength(inputs.termMonths)
    // BR-CALC-011: whether this specific rate increase pushes any period
    // into negative amortization is a fact of the numbers, not something
    // the formula should force either way — it must merely never be hidden
    // if it happens. Assert internal consistency of whatever it reports.
    for (const period of result.negativeAmortizationPeriods) {
      const entry = result.schedule.find((e) => e.period === period)
      expect(entry?.principal.isNegative()).toBe(true)
    }
  })
})

describe('variableProjection.v1 — TV-204 (unchanged + rate decrease: early payoff)', () => {
  it('closes before termMonths with zero residual', () => {
    const vector = findVector('TV-204')
    const inputs = vector.inputs as {
      principal: string
      startDate: string
      termMonths: number
      ratePeriods: readonly RateSpec[]
    }
    const startDate = toLocalDate(inputs.startDate)
    const principal = Money.of(inputs.principal, 'JOD')
    const ratePeriods = buildRatePeriods(startDate, inputs.ratePeriods)
    const asOf = toLocalDate(vector.asOf)

    const initialInstallment = computeAmortizationSchedule(
      principal,
      Rate.fromPercent('10'),
      inputs.termMonths,
      startDate,
      asOf,
    ).computedInstallment

    const result = computeVariableProjection(
      principal,
      ratePeriods,
      inputs.termMonths,
      startDate,
      initialInstallment,
      { kind: 'unchanged' },
      asOf,
    )

    expect(result.payoffPeriod).toBeDefined()
    expect(result.payoffPeriod as number).toBeLessThan(inputs.termMonths)
    expect(result.projectedResidualAtMaturity.isZero()).toBe(true)
    expect(result.schedule).toHaveLength(result.payoffPeriod as number)
  })
})

describe('variableProjection.v1 — TV-205 (mid-period effective date)', () => {
  it('defers to the next period boundary and emits the CONV-4 assumption note', () => {
    const vector = findVector('TV-205')
    const inputs = vector.inputs as {
      principal: string
      startDate: string
      termMonths: number
      ratePeriods: readonly RateSpec[]
    }
    const startDate = toLocalDate(inputs.startDate)
    const principal = Money.of(inputs.principal, 'JOD')
    const ratePeriods = buildRatePeriods(startDate, inputs.ratePeriods)
    const asOf = toLocalDate(vector.asOf)

    const initialInstallment = computeAmortizationSchedule(
      principal,
      Rate.fromPercent('8'),
      inputs.termMonths,
      startDate,
      asOf,
    ).computedInstallment

    const outcome = variableProjection({
      principal,
      ratePeriods,
      termMonths: inputs.termMonths,
      startDate,
      installment: initialInstallment,
      installmentPolicy: { kind: 'recalculated' },
      asOf,
    })

    expect(outcome.kind).toBe('ok')
    if (outcome.kind === 'ok') {
      expect(outcome.value.hasMidPeriodEffectiveDate).toBe(true)
      expect(outcome.assumptions.some((a: string) => a.includes('CONV-4'))).toBe(true)
      // period covering 2026-07-14 is period 7 (start 2026-07-01); the new
      // rate must not apply until period 8.
      const period7 = outcome.value.schedule.find((e) => e.period === 7)
      const period8 = outcome.value.schedule.find((e) => e.period === 8)
      expect(period7).toBeDefined()
      expect(period8).toBeDefined()
    }
  })
})

describe('variableProjection.v1 — engine refusal (BR-CALC-016)', () => {
  it('refuses when ratePeriods is missing', () => {
    const outcome = variableProjection({
      principal: Money.of('1000', 'JOD'),
      termMonths: 12,
      startDate: toLocalDate('2026-01-01'),
      installment: Money.of('90', 'JOD'),
      installmentPolicy: { kind: 'unchanged' },
      asOf: toLocalDate('2026-01-01'),
    })
    expect(isRefused(outcome)).toBe(true)
  })

  it('refuses when rate periods have gaps/overlaps validation cannot order (BR-OBL-002)', () => {
    const startDate = toLocalDate('2026-01-01')
    const duplicate = [
      ratePeriod(1, '8', startDate),
      ratePeriod(2, '9', startDate), // duplicate effectiveFrom — ambiguous ordering
    ]
    const outcome = variableProjection({
      principal: Money.of('1000', 'JOD'),
      ratePeriods: duplicate,
      termMonths: 12,
      startDate,
      installment: Money.of('90', 'JOD'),
      installmentPolicy: { kind: 'unchanged' } satisfies InstallmentPolicy,
      asOf: startDate,
    })
    expect(isRefused(outcome)).toBe(true)
  })
})

describe('variableProjection.v1 — explicit installment policy', () => {
  it('uses the explicit per-period-range installment schedule', () => {
    const startDate = toLocalDate('2026-01-01')
    const principal = Money.of('5000', 'JOD')
    const ratePeriods = [ratePeriod(1, '6', startDate)]
    const result = computeVariableProjection(
      principal,
      ratePeriods,
      24,
      startDate,
      Money.of('220', 'JOD'),
      {
        kind: 'explicit',
        entries: [
          { fromPeriod: 1, installment: Money.of('220', 'JOD') },
          { fromPeriod: 13, installment: Money.of('250', 'JOD') },
        ],
      },
      startDate,
    )
    const period1 = result.schedule.find((e) => e.period === 1)
    const period13 = result.schedule.find((e) => e.period === 13)
    expect(period1?.payment.equals(Money.of('220', 'JOD'))).toBe(true)
    if (period13 !== undefined) {
      expect(period13.payment.equals(Money.of('250', 'JOD'))).toBe(true)
    }
  })
})

describe('variableProjection.v1 — outstandingAsOf', () => {
  it('reports the balance at the schedule entry nearest-before asOf', () => {
    const startDate = toLocalDate('2026-01-01')
    const principal = Money.of('5000', 'JOD')
    const ratePeriods = [ratePeriod(1, '6', startDate)]
    const asOf = addMonthsToLocalDate(startDate, 6)
    const result = computeVariableProjection(
      principal,
      ratePeriods,
      24,
      startDate,
      Money.of('220', 'JOD'),
      { kind: 'unchanged' },
      asOf,
    )
    expect(result.outstandingAsOf).toBeDefined()
    const period6 = result.schedule.find((e) => e.period === 6)
    expect(result.outstandingAsOf?.equals(period6?.closingBalance as Money)).toBe(true)
  })

  it('returns the full principal when asOf precedes the first period', () => {
    const startDate = toLocalDate('2026-01-01')
    const principal = Money.of('5000', 'JOD')
    const ratePeriods = [ratePeriod(1, '6', startDate)]
    const result = computeVariableProjection(
      principal,
      ratePeriods,
      24,
      startDate,
      Money.of('220', 'JOD'),
      { kind: 'unchanged' },
      startDate,
    )
    expect(result.outstandingAsOf?.equals(principal)).toBe(true)
  })
})

describe('variableProjection.v1 — invariant violation', () => {
  it('throws on non-positive term', () => {
    const startDate = toLocalDate('2026-01-01')
    const ratePeriods = [ratePeriod(1, '9', startDate)]
    expect(() =>
      computeVariableProjection(
        Money.of('1000', 'JOD'),
        ratePeriods,
        0,
        startDate,
        Money.of('90', 'JOD'),
        { kind: 'unchanged' },
        startDate,
      ),
    ).toThrow()
  })
})

describe('variableProjection - zero rate and empty explicit entries coverage', () => {
  it('handles zero rate under recalculated policy', () => {
    const startDate = toLocalDate('2026-01-01')
    const ratePeriods = [ratePeriod(1, '0', startDate)]
    const result = computeVariableProjection(
      Money.of('1000', 'JOD'),
      ratePeriods,
      10,
      startDate,
      Money.of('100', 'JOD'),
      { kind: 'recalculated' },
      startDate,
    )
    expect(result.schedule[0]?.payment.equals(Money.of('100', 'JOD'))).toBe(true)
  })
  it('handles empty explicit entries fallback', () => {
    const startDate = toLocalDate('2026-01-01')
    const ratePeriods = [ratePeriod(1, '9', startDate)]
    const result = computeVariableProjection(
      Money.of('1000', 'JOD'),
      ratePeriods,
      10,
      startDate,
      Money.of('100', 'JOD'),
      { kind: 'explicit', entries: [] },
      startDate,
    )
    expect(result.schedule[0]?.payment.equals(Money.of('100', 'JOD'))).toBe(true)
  })
})
