import {
  buildDemoLoan,
  buildDemoCard,
  buildDemoInsights,
  DEMO_DATE,
  DEMO_IDS,
} from '@eltizamati/demo-data'
import { isOk, Money, type CreditCard } from '@eltizamati/domain'
import { InsightEvaluationService } from '../insight-evaluation-service'
import { CalculationService } from '../calculation-service'
import { DemoInsightRepository } from '../repositories/demo/demo-insight-repository'
import { DemoCalculationRunRepository } from '../repositories/demo/demo-calculation-run-repository'

const EXPECTED_RULE_IDS = [
  'RATE_INCREASED',
  'INSTALLMENT_UNCHANGED_AFTER_INCREASE',
  'RESIDUAL_RISK',
]

function makeService(): InsightEvaluationService {
  return new InsightEvaluationService(
    new DemoInsightRepository(),
    new CalculationService(new DemoCalculationRunRepository()),
  )
}

describe('InsightEvaluationService', () => {
  it('raises nothing new when the repository is already seeded with the (fixed) demo insights', async () => {
    const insightRepo = new DemoInsightRepository()
    const seeded = buildDemoInsights(DEMO_DATE)
    for (const insight of seeded) {
      await insightRepo.raise(insight)
    }
    const service = new InsightEvaluationService(
      insightRepo,
      new CalculationService(new DemoCalculationRunRepository()),
    )

    const before = await insightRepo.list(DEMO_IDS.userId)
    expect(isOk(before)).toBe(true)
    const beforeLength = isOk(before) ? before.value.length : -1

    const loan = buildDemoLoan(DEMO_DATE)
    const result = await service.evaluateForLoan(DEMO_IDS.userId, loan, DEMO_DATE)
    expect(isOk(result)).toBe(true)

    const after = await insightRepo.list(DEMO_IDS.userId)
    expect(isOk(after)).toBe(true)
    const afterLength = isOk(after) ? after.value.length : -2

    // This is the load-bearing assertion: it validates that Task 1's real
    // triggerHash/params fix made the seed and the live evaluator agree —
    // if they disagreed, this service would raise duplicate insights on top
    // of the seed.
    expect(afterLength).toBe(beforeLength)
    expect(afterLength).toBe(seeded.length)
  })

  it('raises the same insights only once across two evaluations (dedup)', async () => {
    const service = makeService()
    const loan = buildDemoLoan(DEMO_DATE)

    const first = await service.evaluateForLoan(DEMO_IDS.userId, loan, DEMO_DATE)
    expect(isOk(first)).toBe(true)
    const firstLength = isOk(first) ? first.value.length : -1

    const second = await service.evaluateForLoan(DEMO_IDS.userId, loan, DEMO_DATE)
    expect(isOk(second)).toBe(true)
    const secondLength = isOk(second) ? second.value.length : -2

    expect(secondLength).toBe(firstLength)
    if (isOk(second)) {
      const ids = second.value.map((i) => i.id)
      expect(new Set(ids).size).toBe(ids.length) // no duplicate ids
      const keys = second.value.map((i) => `${i.ruleId}|${i.obligationId ?? ''}|${i.triggerHash}`)
      expect(new Set(keys).size).toBe(keys.length) // no duplicate (ruleId, obligationId, triggerHash)
    }
  })

  it('raises exactly the 3 expected rule ids starting from an empty repository', async () => {
    const service = makeService()
    const loan = buildDemoLoan(DEMO_DATE)

    const result = await service.evaluateForLoan(DEMO_IDS.userId, loan, DEMO_DATE)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const ruleIds = result.value.map((i) => i.ruleId).sort()
      expect(ruleIds).toEqual([...EXPECTED_RULE_IDS].sort())
    }
  })
})

describe('InsightEvaluationService.evaluateForCard', () => {
  it('does not fire for the demo card (58.75% utilization, under the 70% threshold)', async () => {
    const service = makeService()
    const card = buildDemoCard(DEMO_DATE)

    const result = await service.evaluateForCard(DEMO_IDS.userId, card, DEMO_DATE)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.some((i) => i.ruleId === 'HIGH_CARD_UTILIZATION')).toBe(false)
    }
  })

  it('fires HIGH_CARD_UTILIZATION when balance exceeds 70% of the limit', async () => {
    const service = makeService()
    const card = buildDemoCard(DEMO_DATE)
    const highUtilizationCard: CreditCard = {
      ...card,
      cardDetails: {
        ...card.cardDetails,
        currentBalance: {
          ...card.cardDetails.currentBalance,
          value: Money.of('3200', 'JOD'), // 80% of the 4000 JOD limit
        },
      },
    }

    const result = await service.evaluateForCard(DEMO_IDS.userId, highUtilizationCard, DEMO_DATE)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const insight = result.value.find((i) => i.ruleId === 'HIGH_CARD_UTILIZATION')
      expect(insight).toBeDefined()
      expect(insight?.params?.['percent']).toBe(80)
    }
  })

  it('dedups across two evaluations of the same high-utilization card', async () => {
    const service = makeService()
    const card = buildDemoCard(DEMO_DATE)
    const highUtilizationCard: CreditCard = {
      ...card,
      cardDetails: {
        ...card.cardDetails,
        currentBalance: { ...card.cardDetails.currentBalance, value: Money.of('3200', 'JOD') },
      },
    }

    await service.evaluateForCard(DEMO_IDS.userId, highUtilizationCard, DEMO_DATE)
    const second = await service.evaluateForCard(DEMO_IDS.userId, highUtilizationCard, DEMO_DATE)
    expect(isOk(second)).toBe(true)
    if (isOk(second)) {
      const utilizationInsights = second.value.filter((i) => i.ruleId === 'HIGH_CARD_UTILIZATION')
      expect(utilizationInsights).toHaveLength(1)
    }
  })
})

describe('InsightEvaluationService.evaluateUserThreshold', () => {
  it('fires USER_THRESHOLD_REACHED when the gap exceeds the configured threshold', async () => {
    const service = makeService()
    const loan = buildDemoLoan(DEMO_DATE)

    const result = await service.evaluateUserThreshold(
      DEMO_IDS.userId,
      loan.id,
      Money.of('500', 'JOD'),
      Money.of('300', 'JOD'),
      DEMO_DATE,
    )
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const insight = result.value.find((i) => i.ruleId === 'USER_THRESHOLD_REACHED')
      expect(insight).toBeDefined()
      expect(insight?.params?.['gap']).toBe('500')
      expect(insight?.params?.['threshold']).toBe('300')
    }
  })

  it('does not fire when the gap is at or below the threshold', async () => {
    const service = makeService()
    const loan = buildDemoLoan(DEMO_DATE)

    const result = await service.evaluateUserThreshold(
      DEMO_IDS.userId,
      loan.id,
      Money.of('300', 'JOD'),
      Money.of('300', 'JOD'),
      DEMO_DATE,
    )
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.some((i) => i.ruleId === 'USER_THRESHOLD_REACHED')).toBe(false)
    }
  })

  it('dedups across two evaluations with the same gap/threshold', async () => {
    const service = makeService()
    const loan = buildDemoLoan(DEMO_DATE)

    await service.evaluateUserThreshold(
      DEMO_IDS.userId,
      loan.id,
      Money.of('500', 'JOD'),
      Money.of('300', 'JOD'),
      DEMO_DATE,
    )
    const second = await service.evaluateUserThreshold(
      DEMO_IDS.userId,
      loan.id,
      Money.of('500', 'JOD'),
      Money.of('300', 'JOD'),
      DEMO_DATE,
    )
    expect(isOk(second)).toBe(true)
    if (isOk(second)) {
      const thresholdInsights = second.value.filter((i) => i.ruleId === 'USER_THRESHOLD_REACHED')
      expect(thresholdInsights).toHaveLength(1)
    }
  })
})
