import { describe, expect, it } from 'vitest'
import { buildDemoLoan, DEMO_DATE } from '@eltizamati/demo-data'
import { Money, Rate, toLocalDate, brandId, type RatePeriod } from '@eltizamati/domain'
import { computeExtraPaymentScenario, extraPaymentScenario } from './extra-payment-scenario.js'
import { isEngineOk, isRefused } from '../refusal.js'
import { loadVectorFamily } from '../test-support/load-vectors.js'

const vectors = loadVectorFamily('tv-3xx-demo-seed.json')
const loan = buildDemoLoan(DEMO_DATE)

describe('extraPaymentScenario.v1 — TV-304 (demo seed money-shot)', () => {
  it('extra 50 JOD/month from month 31 saves months and shrinks the residual', () => {
    const vector = vectors.find((v) => v.id === 'TV-304')
    expect(vector).toBeDefined()

    const result = computeExtraPaymentScenario(
      loan.loanDetails.originalPrincipal.value,
      loan.loanDetails.ratePeriods,
      loan.loanDetails.termMonths.value,
      loan.loanDetails.startDate,
      loan.loanDetails.installment.value,
      { kind: 'unchanged' },
      DEMO_DATE,
      Money.of('50', 'JOD'),
      undefined,
      31,
    )

    expect(result.monthsSaved).toBeGreaterThan(0)
    expect(
      result.scenarioResidualAtMaturity.isLessThan(result.baseResidualAtMaturity) ||
        result.scenarioResidualAtMaturity.isZero(),
    ).toBe(true)
    expect(result.costSaved.isNegative()).toBe(false)
  })
})

describe('extraPaymentScenario.v1 — INV-3 (more payment never worsens payoff)', () => {
  const startDate = toLocalDate('2026-01-01')
  const obligationId = brandId<'obligation'>('inv3-obligation-0000-0000-000000')
  const ratePeriods: readonly RatePeriod[] = [
    {
      id: brandId('inv3-rp-1'),
      obligationId,
      annualRate: Rate.fromPercent('9'),
      effectiveFrom: startDate,
      provenance: {
        source: 'userEntered',
        providerId: 'manual',
        observedAt: '2026-01-01T00:00:00.000Z',
        recordedAt: '2026-01-01T00:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]

  it.each([
    ['unchanged', Money.of('50', 'JOD')],
    ['unchanged', Money.of('200', 'JOD')],
    ['recalculated', Money.of('50', 'JOD')],
  ] as const)('extra %s payment of %s never lengthens payoff or raises cost', (kind, extra) => {
    const principal = Money.of('10000', 'JOD')
    const termMonths = 60
    const installment = Money.of('300', 'JOD')

    const result = computeExtraPaymentScenario(
      principal,
      ratePeriods,
      termMonths,
      startDate,
      installment,
      { kind },
      startDate,
      extra,
      undefined,
      1,
    )

    expect(result.scenarioPayoffPeriod).toBeLessThanOrEqual(result.basePayoffPeriod)
    expect(result.costSaved.isNegative()).toBe(false)
  })
})

describe('extraPaymentScenario — engine refusal (BR-CALC-016)', () => {
  it('refuses when neither extraMonthly nor oneTime is provided', () => {
    const outcome = extraPaymentScenario({
      principal: Money.of('1000', 'JOD'),
      ratePeriods: [
        {
          id: brandId('refusal-rp-1'),
          obligationId: brandId('refusal-obl-1'),
          annualRate: Rate.fromPercent('9'),
          effectiveFrom: toLocalDate('2026-01-01'),
          provenance: {
            source: 'userEntered',
            providerId: 'manual',
            observedAt: '2026-01-01T00:00:00.000Z',
            recordedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      termMonths: 12,
      startDate: toLocalDate('2026-01-01'),
      installment: Money.of('90', 'JOD'),
      installmentPolicy: { kind: 'unchanged' },
      asOf: toLocalDate('2026-01-01'),
    })
    expect(isRefused(outcome)).toBe(true)
  })

  it('succeeds when extraMonthly is provided', () => {
    const startDate = toLocalDate('2026-01-01')
    const outcome = extraPaymentScenario({
      principal: Money.of('1000', 'JOD'),
      ratePeriods: [
        {
          id: brandId('ok-rp-1'),
          obligationId: brandId('ok-obl-1'),
          annualRate: Rate.fromPercent('9'),
          effectiveFrom: startDate,
          provenance: {
            source: 'userEntered',
            providerId: 'manual',
            observedAt: '2026-01-01T00:00:00.000Z',
            recordedAt: '2026-01-01T00:00:00.000Z',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      termMonths: 12,
      startDate,
      installment: Money.of('90', 'JOD'),
      installmentPolicy: { kind: 'unchanged' },
      extraMonthly: Money.of('20', 'JOD'),
      asOf: startDate,
    })
    expect(isEngineOk(outcome)).toBe(true)
  })
})

describe('extraPaymentScenario.v1 — oneTime extra payment', () => {
  it('applies a one-time extra payment at the specified period', () => {
    const startDate = toLocalDate('2026-01-01')
    const obligationId = brandId<'obligation'>('onetime-obl')
    const ratePeriods: readonly RatePeriod[] = [
      {
        id: brandId('onetime-rp'),
        obligationId,
        annualRate: Rate.fromPercent('9'),
        effectiveFrom: startDate,
        provenance: {
          source: 'userEntered',
          providerId: 'manual',
          observedAt: '2026-01-01T00:00:00.000Z',
          recordedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const result = computeExtraPaymentScenario(
      Money.of('10000', 'JOD'),
      ratePeriods,
      60,
      startDate,
      Money.of('300', 'JOD'),
      { kind: 'unchanged' },
      startDate,
      undefined,
      { amount: Money.of('2000', 'JOD'), period: 6 },
      1,
    )

    expect(result.scenarioPayoffPeriod).toBeLessThanOrEqual(result.basePayoffPeriod)
    expect(result.costSaved.isNegative()).toBe(false)
  })
})

describe('extraPaymentScenario — invariant violation', () => {
  it('computeExtraPaymentScenario throws directly when neither extra kind is given', () => {
    const startDate = toLocalDate('2026-01-01')
    const obligationId = brandId<'obligation'>('novalid-obl')
    const ratePeriods: readonly RatePeriod[] = [
      {
        id: brandId('novalid-rp'),
        obligationId,
        annualRate: Rate.fromPercent('9'),
        effectiveFrom: startDate,
        provenance: {
          source: 'userEntered',
          providerId: 'manual',
          observedAt: '2026-01-01T00:00:00.000Z',
          recordedAt: '2026-01-01T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    expect(() =>
      computeExtraPaymentScenario(
        Money.of('1000', 'JOD'),
        ratePeriods,
        12,
        startDate,
        Money.of('90', 'JOD'),
        { kind: 'unchanged' },
        startDate,
        undefined,
        undefined,
        1,
      ),
    ).toThrow()
  })
})

describe('extraPaymentScenario - empty ratePeriods coverage', () => {
  it('refuses on empty ratePeriods', () => {
    expect(
      isRefused(
        extraPaymentScenario({
          principal: Money.of('1000', 'JOD'),
          ratePeriods: [],
          termMonths: 12,
          startDate: toLocalDate('2026-01-01'),
          installment: Money.of('90', 'JOD'),
          installmentPolicy: { kind: 'unchanged' },
          extraMonthly: Money.of('20', 'JOD'),
          asOf: toLocalDate('2026-01-01'),
        }),
      ),
    ).toBe(true)
  })
})
