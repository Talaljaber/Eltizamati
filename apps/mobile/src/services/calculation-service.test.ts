import { CalculationService } from './calculation-service'
import { DemoCalculationRunRepository } from './repositories/demo/demo-calculation-run-repository'
import { brandId, toLocalDate, Money, Rate, isOk } from '@eltizamati/domain'
import { amortization } from '@eltizamati/finance-engine'

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

    const result = await service.runCalculation(
      userId,
      obligationId,
      'amortization',
      inputs,
      asOf,
      amortization,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.formulaId).toBe('amortization')
      expect(result.value.outcome.kind).toBe('result')
      expect(result.value.inputsHash).toBeDefined()
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
    } as unknown as Parameters<typeof amortization>[0]

    const result = await service.runCalculation(
      userId,
      obligationId,
      'amortization',
      inputs,
      asOf,
      amortization,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.outcome.kind).toBe('refused')
      if (result.value.outcome.kind === 'refused') {
        expect(result.value.outcome.missingFields).toContain('termMonths')
      }
    }
  })
})
