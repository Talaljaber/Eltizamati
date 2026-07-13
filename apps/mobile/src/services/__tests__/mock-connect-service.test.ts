import { brandId } from '@eltizamati/domain'
import { createDemoRepositories } from '../repositories/demo'
import { MockConnectService } from '../mock-connect-service'

describe('MockConnectService', () => {
  it('imports a permanently mock-labeled synthetic card for the active user', async () => {
    const repos = createDemoRepositories()
    const userId = brandId<'user'>('mock-test-user')
    const result = await new MockConnectService().retrieveAndImport(userId, repos)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const stored = await repos.obligationRepository.get(result.value.obligationId)
    expect(stored.ok).toBe(true)
    if (stored.ok) {
      expect(stored.value.userId).toBe(userId)
      expect(stored.value.kind).toBe('creditCard')
      expect(stored.value.provenance.providerId).toBe('mock-open-banking')
      expect(stored.value.provenance.sourceReference).toBe('mock-provider-v1')
    }
  })
})
