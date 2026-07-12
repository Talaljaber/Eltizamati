// uses global jest functions
import type { InsightRepository, Insight, Id } from '@eltizamati/domain'
import { brandId } from '@eltizamati/domain'

function makeInsight(
  id: Id<'insight'>,
  userId: Id<'user'>,
  obligationId: Id<'obligation'> | undefined,
  ruleId: string,
  triggerHash: string,
): Insight {
  return {
    id,
    userId,
    obligationId,
    ruleId,
    severity: 'attention',
    titleKey: 'insights.rateIncreased.title',
    bodyKey: 'insights.rateIncreased.body',
    triggerHash,
    createdAt: '2026-07-01T00:00:00.000Z',
  }
}

/**
 * Runs contract tests for any InsightRepository implementation.
 * `obligationId` must be a real, already-persisted obligation (or
 * `undefined` for an obligation-agnostic insight) — see payment.contract.ts's
 * note on the Supabase FK requirement.
 */
export function runInsightRepositoryContractTests(
  repoFactory: () => InsightRepository,
  createTestUserId: () => Id<'user'>,
  obligationId: Id<'obligation'> | undefined,
  cleanup: () => Promise<void> | void = () => undefined,
) {
  describe('InsightRepository Contract', () => {
    it('raise then list round-trips the insight', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()
      const id = brandId<'insight'>(crypto.randomUUID())
      const insight = makeInsight(id, userId, obligationId, 'RATE_INCREASED', `trigger-${id}`)

      const raised = await repo.raise(insight)
      expect(raised.ok).toBe(true)

      const list = await repo.list(userId)
      expect(list.ok).toBe(true)
      if (list.ok) {
        const found = list.value.find((i) => i.id === id)
        expect(found).toBeDefined()
        expect(found?.readAt).toBeUndefined()
      }

      await cleanup()
    })

    it('list only returns insights owned by the requested user', async () => {
      const repo = repoFactory()
      const userA = createTestUserId()
      const userB = createTestUserId()
      const idA = brandId<'insight'>(crypto.randomUUID())

      await repo.raise(makeInsight(idA, userA, obligationId, 'RATE_INCREASED', `trigger-${idA}`))

      const listB = await repo.list(userB)
      expect(listB.ok).toBe(true)
      if (listB.ok) expect(listB.value.some((i) => i.id === idA)).toBe(false)

      await cleanup()
    })

    it('markRead sets readAt without deleting the insight', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()
      const id = brandId<'insight'>(crypto.randomUUID())
      await repo.raise(makeInsight(id, userId, obligationId, 'RATE_INCREASED', `trigger-${id}`))

      const marked = await repo.markRead(id)
      expect(marked.ok).toBe(true)

      const list = await repo.list(userId)
      expect(list.ok).toBe(true)
      if (list.ok) {
        const found = list.value.find((i) => i.id === id)
        expect(found).toBeDefined()
        expect(found?.readAt).toBeDefined()
      }

      await cleanup()
    })
  })
}
