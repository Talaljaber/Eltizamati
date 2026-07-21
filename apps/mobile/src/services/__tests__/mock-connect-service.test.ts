import { brandId, Rate } from '@eltizamati/domain'
import { createDemoRepositories } from '../repositories/demo'
import { MockConnectService } from '../mock-connect-service'
import { ImportService } from '../import-service'

describe('MockConnectService', () => {
  describe('retrieve', () => {
    it('returns a typed error for an unknown bank id, never a silent fallback', async () => {
      const service = new MockConnectService()
      const result = await service.retrieve('not-a-real-bank')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('notFound')
    })

    it('returns a per-bank record set for a bank with a catalog entry', async () => {
      const service = new MockConnectService()
      const result = await service.retrieve('arab-bank')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.length).toBeGreaterThan(0)
        expect(result.value.every((record) => record.institutionName === 'Arab Bank')).toBe(true)
      }
    })

    it('returns an empty list (not an error) for a real bank with no catalog entry', async () => {
      const service = new MockConnectService()
      const result = await service.retrieve('blink')
      expect(result).toEqual({ ok: true, value: [] })
    })

    it('two different banks never produce colliding external ids', async () => {
      const service = new MockConnectService()
      const [a, b] = await Promise.all([service.retrieve('arab-bank'), service.retrieve('capital-bank')])
      expect(a.ok && b.ok).toBe(true)
      if (a.ok && b.ok) {
        const idsA = new Set(a.value.map((r) => r.externalId))
        const idsB = b.value.map((r) => r.externalId)
        for (const id of idsB) expect(idsA.has(id)).toBe(false)
      }
    })
  })

  describe('classify', () => {
    it('produces a deterministic obligation id for the same bank/record/user', async () => {
      const service = new MockConnectService()
      const userId = brandId<'user'>('mock-test-user')
      const records = await service.retrieve('arab-bank')
      if (!records.ok) throw new TypeError('unreachable')
      const record = records.value[0]
      if (record === undefined) throw new TypeError('unreachable')

      const first = service.classify(record, userId, 'arab-bank')
      const second = service.classify(record, userId, 'arab-bank')
      expect(first.id).toBe(second.id)
    })

    it('produces different obligation ids for different users importing the same record', async () => {
      const service = new MockConnectService()
      const records = await service.retrieve('arab-bank')
      if (!records.ok) throw new TypeError('unreachable')
      const record = records.value[0]
      if (record === undefined) throw new TypeError('unreachable')

      const a = service.classify(record, brandId<'user'>('user-a'), 'arab-bank')
      const b = service.classify(record, brandId<'user'>('user-b'), 'arab-bank')
      expect(a.id).not.toBe(b.id)
    })

    it('classifies every record as official, with mock demo provenance', async () => {
      const service = new MockConnectService()
      const userId = brandId<'user'>('mock-test-user')
      const records = await service.retrieve('capital-bank')
      if (!records.ok) throw new TypeError('unreachable')
      for (const record of records.value) {
        const obligation = service.classify(record, userId, 'capital-bank')
        expect(obligation.connectionType).toBe('official')
        expect(obligation.provenance.source).toBe('demo')
        expect(obligation.provenance.providerId).toBe('mock-open-banking')
      }
    })

    it('embeds an initial rate period on a classified conventional loan', async () => {
      const service = new MockConnectService()
      const userId = brandId<'user'>('mock-test-user')
      const records = await service.retrieve('housing-bank')
      if (!records.ok) throw new TypeError('unreachable')
      const loanRecord = records.value.find((r) => r.productType === 'conventionalLoan')
      if (loanRecord === undefined) throw new TypeError('unreachable')
      const loan = service.classify(loanRecord, userId, 'housing-bank')
      if (loan.kind !== 'conventionalLoan') throw new TypeError('unreachable')
      expect(loan.loanDetails.ratePeriods).toHaveLength(1)
      expect(loan.loanDetails.ratePeriods[0]?.obligationId).toBe(loan.id)
    })
  })

  describe('retrieveAndImport (legacy /connect-mock path)', () => {
    it('imports a permanently mock-labeled synthetic card for the active user', async () => {
      const repos = createDemoRepositories()
      const userId = brandId<'user'>('mock-test-user')
      const service = new MockConnectService()
      const result = await service.retrieveAndImport(userId, repos)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stored = await repos.obligationRepository.get(result.value.obligationId)
      expect(stored.ok).toBe(true)
      if (stored.ok) {
        expect(stored.value.userId).toBe(userId)
        expect(stored.value.kind).toBe('creditCard')
        expect(stored.value.provenance.providerId).toBe('mock-open-banking')
      }
    })
  })

  describe('ImportService.importProviderObligations (multi-select import)', () => {
    it('is idempotent — importing the same selection twice reports success both times with no duplicates', async () => {
      const repos = createDemoRepositories()
      const userId = brandId<'user'>('mock-test-user')
      const service = new MockConnectService()
      const importService = new ImportService()
      const records = await service.retrieve('capital-bank')
      if (!records.ok) throw new TypeError('unreachable')
      const obligations = records.value.map((record) => service.classify(record, userId, 'capital-bank'))

      const first = await importService.importProviderObligations(obligations, repos)
      expect(first.failed).toHaveLength(0)
      expect(first.imported).toHaveLength(obligations.length)

      const second = await importService.importProviderObligations(obligations, repos)
      expect(second.failed).toHaveLength(0)
      expect(second.imported).toHaveLength(obligations.length)

      const list = await repos.obligationRepository.list(userId)
      expect(list.ok).toBe(true)
      if (list.ok) expect(list.value).toHaveLength(obligations.length)
    })

    it('a genuine rate-period conflict fails the record without duplicating the obligation, and a same-data retry cleanly recovers', async () => {
      const repos = createDemoRepositories()
      const userId = brandId<'user'>('mock-test-user')
      const service = new MockConnectService()
      const importService = new ImportService()
      const records = await service.retrieve('housing-bank')
      if (!records.ok) throw new TypeError('unreachable')
      const loanRecord = records.value.find((r) => r.productType === 'conventionalLoan')
      if (loanRecord === undefined) throw new TypeError('unreachable')
      const loan = service.classify(loanRecord, userId, 'housing-bank')
      if (loan.kind !== 'conventionalLoan') throw new TypeError('unreachable')
      const period = loan.loanDetails.ratePeriods[0]
      if (period === undefined) throw new TypeError('unreachable')

      // Pre-seed a DIFFERENT rate at the same deterministic id — simulates
      // "a prior attempt already wrote something inconsistent at this id".
      await repos.ratePeriodRepository.append({ ...period, annualRate: Rate.fromPercent('1') })

      const firstAttempt = await importService.importProviderObligations([loan], repos)
      expect(firstAttempt.imported).toHaveLength(0)
      expect(firstAttempt.failed).toHaveLength(1)
      expect(firstAttempt.failed[0]?.error.code).toBe('dataConflict')

      const listAfterFailure = await repos.obligationRepository.list(userId)
      expect(listAfterFailure.ok).toBe(true)
      // The obligation itself still landed (save() is idempotent) — only the
      // rate period failed. Retrying must not create a second obligation row.
      if (listAfterFailure.ok) expect(listAfterFailure.value).toHaveLength(1)

      const retry = await importService.importProviderObligations([loan], repos)
      expect(retry.failed).toHaveLength(1)
      expect(retry.failed[0]?.error.code).toBe('dataConflict')
      const listAfterRetry = await repos.obligationRepository.list(userId)
      expect(listAfterRetry.ok).toBe(true)
      if (listAfterRetry.ok) expect(listAfterRetry.value).toHaveLength(1)
    })
  })
})
