// uses global jest functions
import type { RatePeriodRepository, RatePeriod, Id } from '@eltizamati/domain'
import { brandId, userEntered, Rate, toLocalDate } from '@eltizamati/domain'

function makePeriod(
  id: Id<'ratePeriod'>,
  obligationId: Id<'obligation'>,
  effectiveFrom: string,
  percent: string,
): RatePeriod {
  const now = '2026-07-01T00:00:00.000Z'
  return {
    id,
    obligationId,
    annualRate: Rate.fromPercent(percent),
    effectiveFrom: toLocalDate(effectiveFrom),
    provenance: userEntered(undefined, now).provenance,
    createdAt: now,
  }
}

/**
 * Runs contract tests for any RatePeriodRepository implementation.
 * `obligationId` must be a real, already-persisted obligation — see
 * payment.contract.ts's note on the Supabase FK requirement.
 */
export function runRatePeriodRepositoryContractTests(
  repoFactory: () => RatePeriodRepository,
  obligationId: Id<'obligation'>,
  cleanup: () => Promise<void> | void = () => undefined,
) {
  describe('RatePeriodRepository Contract', () => {
    it('append then historyFor round-trips the period', async () => {
      const repo = repoFactory()
      const id = brandId<'ratePeriod'>(crypto.randomUUID())
      const period = makePeriod(id, obligationId, '2026-01-15', '7.5')

      const appended = await repo.append(period)
      expect(appended.ok).toBe(true)

      const history = await repo.historyFor(obligationId)
      expect(history.ok).toBe(true)
      if (history.ok) {
        const found = history.value.find((p) => p.id === id)
        expect(found).toBeDefined()
        expect(found?.annualRate.equals(Rate.fromPercent('7.5'))).toBe(true)
      }

      await cleanup()
    })

    it('append-only: a second period never mutates the first (BR-RATE-001)', async () => {
      const repo = repoFactory()
      const firstId = brandId<'ratePeriod'>(crypto.randomUUID())
      const secondId = brandId<'ratePeriod'>(crypto.randomUUID())

      await repo.append(makePeriod(firstId, obligationId, '2026-02-01', '7.5'))
      await repo.append(makePeriod(secondId, obligationId, '2026-08-01', '9.25'))

      const history = await repo.historyFor(obligationId)
      expect(history.ok).toBe(true)
      if (history.ok) {
        const first = history.value.find((p) => p.id === firstId)
        // The original period's own rate is untouched by the later append.
        expect(first?.annualRate.equals(Rate.fromPercent('7.5'))).toBe(true)
        expect(history.value.length).toBeGreaterThanOrEqual(2)
      }

      await cleanup()
    })

    it('historyFor an obligation with no periods returns an empty list', async () => {
      const repo = repoFactory()
      const emptyObligationId = brandId<'obligation'>(crypto.randomUUID())

      const history = await repo.historyFor(emptyObligationId)
      expect(history.ok).toBe(true)
      if (history.ok) expect(history.value).toHaveLength(0)

      await cleanup()
    })

    describe('appendIfAbsent (deterministic-id provider import retry)', () => {
      it('inserts a fresh period', async () => {
        const repo = repoFactory()
        const id = brandId<'ratePeriod'>(crypto.randomUUID())
        const period = makePeriod(id, obligationId, '2026-03-01', '6.25')

        const result = await repo.appendIfAbsent(period)
        expect(result.ok).toBe(true)

        const history = await repo.historyFor(obligationId)
        expect(history.ok && history.value.some((p) => p.id === id)).toBe(true)

        await cleanup()
      })

      it('retrying the exact same period is a no-op success, not a duplicate or an error', async () => {
        const repo = repoFactory()
        const id = brandId<'ratePeriod'>(crypto.randomUUID())
        const period = makePeriod(id, obligationId, '2026-04-01', '6.5')

        const first = await repo.appendIfAbsent(period)
        expect(first.ok).toBe(true)
        const second = await repo.appendIfAbsent(period)
        expect(second.ok).toBe(true)
        if (second.ok) expect(second.value.id).toBe(id)

        const history = await repo.historyFor(obligationId)
        if (history.ok) {
          expect(history.value.filter((p) => p.id === id)).toHaveLength(1)
        }

        await cleanup()
      })

      it('the same id with different data is a surfaced dataConflict, never a silent overwrite', async () => {
        const repo = repoFactory()
        const id = brandId<'ratePeriod'>(crypto.randomUUID())
        const original = makePeriod(id, obligationId, '2026-05-01', '7')
        const conflicting = makePeriod(id, obligationId, '2026-05-01', '9')

        const first = await repo.appendIfAbsent(original)
        expect(first.ok).toBe(true)
        const second = await repo.appendIfAbsent(conflicting)
        expect(second.ok).toBe(false)
        if (!second.ok) expect(second.error.code).toBe('dataConflict')

        const history = await repo.historyFor(obligationId)
        const stored = history.ok ? history.value.find((p) => p.id === id) : undefined
        // The original data was never overwritten by the conflicting attempt.
        expect(stored?.annualRate.equals(Rate.fromPercent('7'))).toBe(true)

        await cleanup()
      })
    })
  })
}
