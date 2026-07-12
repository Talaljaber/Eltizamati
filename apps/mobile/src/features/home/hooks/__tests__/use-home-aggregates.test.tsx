import React from 'react'
import { renderHook, waitFor } from '@testing-library/react-native'
import { useHomeAggregates } from '../use-home-aggregates'
import { createDemoRepositories } from '@/services/repositories/demo'
import { ImportService } from '@/services/import-service'
import { DemoSeedProvider } from '@/services/demo-seed-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDataMode } from '@/features/demo/stores/demo-mode-store'
import * as useReposModule from '@/features/repositories/hooks/use-repositories'

jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  getDataMode: jest.fn(),
}))

jest.mock('@/features/auth/hooks/use-auth-service', () => ({
  useAuthServiceLazy: jest.fn(() => () => ({
    ok: true,
    value: {
      currentSession: jest.fn().mockResolvedValue({ ok: true, value: { user: { id: 'user-1' } } }),
      onAuthStateChange: jest.fn(() => jest.fn()),
    },
  })),
}))

describe('useHomeAggregates', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    ;(getDataMode as jest.Mock).mockResolvedValue('demo')
  })

  it('resolves total monthly commitment and next due payment against seeded demo data', async () => {
    const repos = createDemoRepositories()
    const seed = new DemoSeedProvider().provide()
    await new ImportService().importDemoSeed(seed, repos)

    jest.spyOn(useReposModule, 'useRepositories').mockReturnValue(repos)

    const obligationsRes = await repos.obligationRepository.list(seed.userId)
    expect(obligationsRes.ok).toBe(true)
    if (!obligationsRes.ok) return
    const obligations = obligationsRes.value

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useHomeAggregates(obligations), { wrapper })

    await waitFor(
      () => {
        expect(result.current.status).not.toBe('loading')
      },
      { timeout: 3000 },
    )

    expect(result.current.status).toBe('success')
    if (result.current.status !== 'success') return

    expect(result.current.totalMonthlyCommitment).toBeDefined()
  })
})
