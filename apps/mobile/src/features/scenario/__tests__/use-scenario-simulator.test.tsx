import React from 'react'
import { renderHook, waitFor } from '@testing-library/react-native'
import { useScenarioSimulator } from '../hooks/use-scenario-simulator'
import { createDemoRepositories } from '@/services/repositories/demo'
import { ImportService } from '@/services/import-service'
import { DemoSeedProvider } from '@/services/demo-seed-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDataMode } from '@/features/demo/stores/demo-mode-store'
import * as useReposModule from '@/features/repositories/hooks/use-repositories'
import { DEMO_IDS } from '@eltizamati/demo-data'

jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  getDataMode: jest.fn(),
}))

jest.mock('@/features/auth/hooks/use-auth-service', () => ({
  useAuthService: jest.fn(() => ({
    ok: true,
    value: {
      currentSession: jest.fn().mockResolvedValue({ ok: true, value: { user: { id: 'user-1' } } }),
      onAuthStateChange: jest.fn(() => jest.fn()),
    },
  })),
}))

describe('useScenarioSimulator', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    ;(getDataMode as jest.Mock).mockResolvedValue('demo')
  })

  it('structurally resolves a scenario calculation without final TV-304 assertions', async () => {
    // Phase 7: structural test. We don't assert exact numbers since TV-30x is pending.
    const repos = createDemoRepositories()
    const seed = new DemoSeedProvider().provide()
    await new ImportService().importDemoSeed(seed, repos)

    jest.spyOn(useReposModule, 'useRepositories').mockReturnValue(repos)

    const obligationRes = await repos.obligationRepository.list(DEMO_IDS.userId)
    const targetObligation = obligationRes.ok ? obligationRes.value[0] : undefined
    expect(targetObligation).toBeDefined()
    if (!targetObligation) return

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useScenarioSimulator(targetObligation.id), { wrapper })

    expect(result.current.status).toBe('loading')

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    }, { timeout: 2000 })

    expect(result.current.run).toBeDefined()
    if (result.current.run?.outcome.kind === 'result') {
      const snapshot = result.current.run.outcome.resultSnapshot as Record<string, unknown>
      // Assert structural keys exist
      expect(snapshot.monthsSaved).toBeDefined()
      expect(snapshot.costSaved).toBeDefined()
    } else {
      expect(result.current.run?.outcome.kind).toBe('result')
    }
  })
})
