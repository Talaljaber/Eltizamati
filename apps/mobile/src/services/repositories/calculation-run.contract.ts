// uses global jest functions
import type { CalculationRunRepository, CalculationRun, Id } from '@eltizamati/domain'
import { brandId, toLocalDate, hashCanonicalJson } from '@eltizamati/domain'
import type { FormulaId } from '@eltizamati/finance-engine'

/**
 * Runs contract tests for any CalculationRunRepository implementation.
 *
 * Enforces scope matching:
 * - obligationId defined means an obligation-scoped calculation
 * - obligationId undefined means an aggregate/unscoped calculation
 * - undefined must match only runs whose obligationId is also undefined
 */
export function runCalculationRunContractTests(
  repoFactory: () => CalculationRunRepository,
  createTestUserId: () => Id<'user'>,
  cleanup: () => Promise<void> | void = () => {},
) {
  describe('CalculationRunRepository Contract', () => {
    it('matches strictly on scope and formulaId', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()

      const obligationA = brandId<'obligation'>('obl-a')
      const obligationB = brandId<'obligation'>('obl-b')
      const formulaId = 'amortization' as FormulaId

      const baseRun = {
        userId,
        formulaId,
        formulaVersion: 1 as const,
        asOf: toLocalDate('2026-07-01'),
        inputsSnapshot: { test: true },
        inputsHash: hashCanonicalJson({ test: true }),
        outcome: { kind: 'result', confidence: 'HIGH', resultSnapshot: {} } as const,
        assumptions: [],
        calculatedAt: '2026-07-01T12:00:00.000Z',
      }

      const runScopedA: CalculationRun = {
        ...baseRun,
        id: brandId<'calculationRun'>('run-a'),
        obligationId: obligationA,
        calculatedAt: '2026-07-01T10:00:00.000Z',
      }

      const runScopedB: CalculationRun = {
        ...baseRun,
        id: brandId<'calculationRun'>('run-b'),
        obligationId: obligationB,
        calculatedAt: '2026-07-01T11:00:00.000Z',
      }

      const runUnscoped: CalculationRun = {
        ...baseRun,
        id: brandId<'calculationRun'>('run-unscoped'),
        obligationId: undefined,
        calculatedAt: '2026-07-01T12:00:00.000Z',
      }

      // Persist them out of order
      await repo.persist(runScopedB)
      await repo.persist(runUnscoped)
      await repo.persist(runScopedA)

      // 1. An obligation-A run is returned for obligation A.
      const resA = await repo.latestFor(obligationA, formulaId)
      expect(resA.ok).toBe(true)
      expect(resA.value?.id).toBe('run-a')

      // 2. An obligation-B run is not returned for obligation A.
      expect(resA.value?.id).not.toBe('run-b')

      // 3. An aggregate run is returned for undefined scope.
      const resUnscoped = await repo.latestFor(undefined, formulaId)
      expect(resUnscoped.ok).toBe(true)
      expect(resUnscoped.value?.id).toBe('run-unscoped')

      // 4. An obligation-scoped run is never returned for undefined scope.
      expect(resUnscoped.value?.id).not.toBe('run-a')
      expect(resUnscoped.value?.id).not.toBe('run-b')

      await cleanup()
    })

    it('returns undefined when requesting unscoped, but only scoped exists', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()

      const runScoped: CalculationRun = {
        id: brandId<'calculationRun'>('run-scoped-only'),
        userId,
        obligationId: brandId<'obligation'>('obl-1'),
        formulaId: 'amortization',
        formulaVersion: 1,
        asOf: toLocalDate('2026-07-01'),
        inputsSnapshot: {},
        inputsHash: hashCanonicalJson({}),
        outcome: { kind: 'result', confidence: 'HIGH', resultSnapshot: {} },
        assumptions: [],
        calculatedAt: '2026-07-01T10:00:00.000Z',
      }

      await repo.persist(runScoped)

      // 5. latestFor(undefined) returns undefined when only scoped runs exist
      const res = await repo.latestFor(undefined, 'amortization')
      expect(res.ok).toBe(true)
      expect(res.value).toBeUndefined()

      await cleanup()
    })

    it('sorting returns the latest matching run by calculatedAt', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()
      const obligationId = brandId<'obligation'>('obl-sort')

      const runOld: CalculationRun = {
        id: brandId<'calculationRun'>('old'),
        userId,
        obligationId,
        formulaId: 'amortization',
        formulaVersion: 1,
        asOf: toLocalDate('2026-07-01'),
        inputsSnapshot: {},
        inputsHash: hashCanonicalJson({}),
        outcome: { kind: 'result', confidence: 'HIGH', resultSnapshot: {} },
        assumptions: [],
        calculatedAt: '2026-07-01T10:00:00.000Z',
      }

      const runNew: CalculationRun = {
        ...runOld,
        id: brandId<'calculationRun'>('new'),
        calculatedAt: '2026-07-01T12:00:00.000Z',
      }

      // 6. Sorting still returns the latest matching run by calculatedAt.
      await repo.persist(runOld)
      await repo.persist(runNew)

      const res = await repo.latestFor(obligationId, 'amortization')
      expect(res.ok).toBe(true)
      expect(res.value?.id).toBe('new')

      await cleanup()
    })
  })
}
