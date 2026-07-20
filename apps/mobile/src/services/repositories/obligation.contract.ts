// uses global jest functions
import type { ObligationRepository, GenericFacility, Id } from '@eltizamati/domain'
import { brandId, userEntered } from '@eltizamati/domain'

function makeFacility(id: Id<'obligation'>, userId: Id<'user'>, nickname: string): GenericFacility {
  const now = '2026-07-01T00:00:00.000Z'
  return {
    id,
    userId,
    kind: 'genericFacility',
    connectionType: 'personal',
    nickname,
    institution: { name: 'Test Bank' },
    currency: 'JOD',
    openedDate: '2026-01-01' as GenericFacility['openedDate'],
    provenance: userEntered(undefined, now).provenance,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Runs contract tests for any ObligationRepository implementation —
 * Phase-2 interface parity between the demo and Supabase families
 * (PHASE-04 exit criterion 2). IDs are real UUIDs — Supabase's `id`
 * columns are typed `uuid`, so a non-UUID string fails there even though
 * the demo repository's plain in-memory Map wouldn't care.
 */
export function runObligationRepositoryContractTests(
  repoFactory: () => ObligationRepository,
  createTestUserId: () => Id<'user'>,
  cleanup: () => Promise<void> | void = () => undefined,
) {
  describe('ObligationRepository Contract', () => {
    it('save then get round-trips the obligation', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()
      const id = brandId<'obligation'>(crypto.randomUUID())
      const obligation = makeFacility(id, userId, 'Round-trip facility')

      const saved = await repo.save(obligation)
      expect(saved.ok).toBe(true)

      const read = await repo.get(id)
      expect(read.ok).toBe(true)
      if (read.ok) {
        expect(read.value.nickname).toBe('Round-trip facility')
        expect(read.value.kind).toBe('genericFacility')
      }

      await cleanup()
    })

    it('list only returns obligations owned by the requested user', async () => {
      const repo = repoFactory()
      const userA = createTestUserId()
      const userB = createTestUserId()
      const idA = brandId<'obligation'>(crypto.randomUUID())
      const idB = brandId<'obligation'>(crypto.randomUUID())

      await repo.save(makeFacility(idA, userA, 'Owned by A'))
      await repo.save(makeFacility(idB, userB, 'Owned by B'))

      const listA = await repo.list(userA)
      expect(listA.ok).toBe(true)
      if (listA.ok) {
        expect(listA.value.some((o) => o.id === idA)).toBe(true)
        expect(listA.value.some((o) => o.id === idB)).toBe(false)
      }

      await cleanup()
    })

    it('get returns an error for an unknown id', async () => {
      const repo = repoFactory()
      const result = await repo.get(brandId<'obligation'>(crypto.randomUUID()))
      expect(result.ok).toBe(false)

      await cleanup()
    })

    it('archive sets closedDate without deleting the row', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()
      const id = brandId<'obligation'>(crypto.randomUUID())
      await repo.save(makeFacility(id, userId, 'To archive'))

      const archived = await repo.archive(id)
      expect(archived.ok).toBe(true)

      const stillThere = await repo.get(id)
      expect(stillThere.ok).toBe(true)

      await cleanup()
    })

    it('delete removes the obligation', async () => {
      const repo = repoFactory()
      const userId = createTestUserId()
      const id = brandId<'obligation'>(crypto.randomUUID())
      await repo.save(makeFacility(id, userId, 'To delete'))

      const deleted = await repo.delete(id)
      expect(deleted.ok).toBe(true)

      const gone = await repo.get(id)
      expect(gone.ok).toBe(false)

      await cleanup()
    })
  })
}
