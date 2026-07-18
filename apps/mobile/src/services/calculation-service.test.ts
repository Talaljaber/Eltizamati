import { CalculationService } from './calculation-service'
import { DemoCalculationRunRepository } from './repositories/demo/demo-calculation-run-repository'
import {
  brandId,
  toLocalDate,
  Money,
  Rate,
  isOk,
  isErr,
  hashCanonicalJson,
  toCanonicalJsonValue,
} from '@eltizamati/domain'
import type { FormulaId } from '@eltizamati/finance-engine'

describe('CalculationService', () => {
  it('persists a successful calculation run', async () => {
    const repo = new DemoCalculationRunRepository()
    const service = new CalculationService(repo)

    const userId = brandId<'user'>('u1')
    const obligationId = brandId<'obligation'>('o1')
    const asOf = toLocalDate('2026-01-01')

    const inputs = {
      principal: Money.of('1000', 'JOD'),
      annualRate: Rate.fromPercent('10'),
      termMonths: 12,
      startDate: asOf,
      asOf,
    }
    const calculatedAt = '2026-01-01T12:00:00.000Z'

    const result = await service.runCalculation(
      userId,
      obligationId,
      'amortization',
      1,
      inputs,
      asOf,
      calculatedAt,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.formulaId).toBe('amortization')
      expect(result.value.outcome.kind).toBe('result')
      const expectedSnapshot = toCanonicalJsonValue(inputs)
      // Test-setup fail-fast, not application error handling — ADR-0014's
      // AppError taxonomy governs app code paths, not test assertions.
      // eslint-disable-next-line no-restricted-syntax
      if (!expectedSnapshot.ok) throw new Error('expected ok')
      expect(result.value.inputsHash).toBe(hashCanonicalJson(expectedSnapshot.value))
      expect(result.value.calculatedAt).toBe(calculatedAt)
      expect(result.value.assumptions.length).toBeGreaterThan(0) // comes from registry
    }
  })

  it('persists a refused calculation run', async () => {
    const repo = new DemoCalculationRunRepository()
    const service = new CalculationService(repo)

    const userId = brandId<'user'>('u1')
    const obligationId = brandId<'obligation'>('o1')
    const asOf = toLocalDate('2026-01-01')

    // missing termMonths to force refusal
    const inputs = {
      principal: Money.of('1000', 'JOD'),
      annualRate: Rate.fromPercent('10'),
      startDate: asOf,
      asOf,
    }

    const result = await service.runCalculation(
      userId,
      obligationId,
      'amortization',
      1,
      inputs,
      asOf,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.outcome.kind).toBe('refused')
      if (result.value.outcome.kind === 'refused') {
        expect(result.value.outcome.missingFields).toContain('termMonths')
      }
    }
  })

  it('regression: a refusal with entirely-omitted optional fields persists as refused, not a canonicalization error', async () => {
    // The bug: an omitted-vs-`undefined` optional field (e.g. a card missing
    // its APR) must resolve to a legitimate "missing data" refusal, not a
    // generic error — `toCanonicalJsonValue` rejects explicit `undefined`
    // values (canonical-json.test.ts), so callers must omit the key entirely
    // rather than pass `field: possiblyUndefinedValue`.
    const repo = new DemoCalculationRunRepository()
    const service = new CalculationService(repo)

    const result = await service.runCalculation(
      brandId<'user'>('u1'),
      brandId<'obligation'>('o1'),
      'cardPayoff',
      1,
      {
        balance: Money.of('900', 'JOD'),
        fixedPaymentAmount: Money.of('100', 'JOD'),
        asOf: toLocalDate('2026-01-01'),
      },
      toLocalDate('2026-01-01'),
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.outcome.kind).toBe('refused')
      if (result.value.outcome.kind === 'refused') {
        expect(result.value.outcome.missingFields).toEqual(
          expect.arrayContaining(['annualRate', 'minimumPaymentRule']),
        )
      }
    }
  })

  it('fails safely when an unknown formula id is requested', async () => {
    const repo = new DemoCalculationRunRepository()
    const service = new CalculationService(repo)

    const result = await service.runCalculation(
      brandId('u1'),
      undefined,
      'nonexistent' as FormulaId,
      1,
      { asOf: toLocalDate('2026-01-01') },
      toLocalDate('2026-01-01'),
    )

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('calculationUnsupported')
    }
  })

  it('fails safely when an unknown version is requested', async () => {
    const repo = new DemoCalculationRunRepository()
    const service = new CalculationService(repo)

    const result = await service.runCalculation(
      brandId('u1'),
      undefined,
      'amortization',
      999 as 1,
      { asOf: toLocalDate('2026-01-01') },
      toLocalDate('2026-01-01'),
    )

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('calculationUnsupported')
    }
  })
})
