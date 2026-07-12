// uses global jest functions
import type { ConsentRepository, ConsentRecord, Id } from '@eltizamati/domain'
import { brandId } from '@eltizamati/domain'

function makeConsent(id: Id<'consentRecord'>, userId: Id<'user'>, version: string): ConsentRecord {
  return {
    id,
    userId,
    docType: 'privacy-policy',
    version,
    locale: 'en',
    acknowledgedAt: '2026-07-01T00:00:00.000Z',
  }
}

/** Runs contract tests for any ConsentRepository implementation. */
export function runConsentRepositoryContractTests(
  repoFactory: () => ConsentRepository,
  createTestUserId: () => Id<'user'>,
  cleanup: () => Promise<void> | void = () => undefined,
) {
  describe('ConsentRepository Contract', () => {
    it('acknowledge then status round-trips the record', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()
      const id = brandId<'consentRecord'>(crypto.randomUUID())

      const acknowledged = await repo.acknowledge(makeConsent(id, userId, 'v1'))
      expect(acknowledged.ok).toBe(true)

      const status = await repo.status(userId)
      expect(status.ok).toBe(true)
      if (status.ok) {
        const found = status.value.find((r) => r.id === id)
        expect(found).toBeDefined()
        expect(found?.version).toBe('v1')
      }

      await cleanup()
    })

    it('status only returns records owned by the requested user', async () => {
      const repo = repoFactory()
      const userA = createTestUserId()
      const userB = createTestUserId()
      const idA = brandId<'consentRecord'>(crypto.randomUUID())

      await repo.acknowledge(makeConsent(idA, userA, 'v1'))

      const statusB = await repo.status(userB)
      expect(statusB.ok).toBe(true)
      if (statusB.ok) expect(statusB.value.some((r) => r.id === idA)).toBe(false)

      await cleanup()
    })

    it('re-acknowledging a version bump appends a new record rather than overwriting', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()
      const idV1 = brandId<'consentRecord'>(crypto.randomUUID())
      const idV2 = brandId<'consentRecord'>(crypto.randomUUID())

      await repo.acknowledge(makeConsent(idV1, userId, 'v1'))
      await repo.acknowledge(makeConsent(idV2, userId, 'v2'))

      const status = await repo.status(userId)
      expect(status.ok).toBe(true)
      if (status.ok) {
        expect(status.value.some((r) => r.id === idV1 && r.version === 'v1')).toBe(true)
        expect(status.value.some((r) => r.id === idV2 && r.version === 'v2')).toBe(true)
      }

      await cleanup()
    })
  })
}
