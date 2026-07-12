import { buildDemoLoan, buildDemoInsights, DEMO_DATE, DEMO_IDS } from '@eltizamati/demo-data'
import { isOk } from '@eltizamati/domain'
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
