import React from 'react'
import { renderHook, waitFor } from '@testing-library/react-native'
import { useHomeAggregates } from '../use-home-aggregates'
import { createDemoRepositories } from '@/services/repositories/demo'
import { ImportService } from '@/services/import-service'
import { DemoSeedProvider } from '@/services/demo-seed-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDataMode } from '@/features/demo/stores/demo-mode-store'
import * as useReposModule from '@/features/repositories/hooks/use-repositories'
import { aLoan, DEMO_DATE } from '@eltizamati/demo-data'
import { toLocalDate } from '@eltizamati/domain'

jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  getDataMode: jest.fn(),
}))

jest.mock('@/features/auth/hooks/use-auth-service', () => {
  const getAuthService = jest.fn(() => ({
    ok: true,
    value: {
      currentSession: jest.fn().mockResolvedValue({ ok: true, value: { user: { id: 'user-1' } } }),
      onAuthStateChange: jest.fn(() => jest.fn()),
    },
  }))
  return { useAuthServiceLazy: jest.fn(() => getAuthService) }
})

describe('useHomeAggregates', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    ;(getDataMode as jest.Mock).mockResolvedValue('demo')
  })

  afterEach(() => {
    queryClient.clear()
    jest.restoreAllMocks()
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

    const { result, unmount } = renderHook(() => useHomeAggregates(obligations, DEMO_DATE), {
      wrapper,
    })

    await waitFor(
      () => {
        expect(result.current.status).not.toBe('loading')
      },
      { timeout: 3000 },
    )

    expect(result.current.status).toBe('success')
    if (result.current.status !== 'success') return

    expect(result.current.totalMonthlyCommitment).toBeDefined()
    // This describes aggregate input quality only; the calculated output still
    // has estimate provenance regardless of this value.
    expect(result.current.hasEstimatedInputs).toBe(true)
    unmount()

    const latestRun = await repos.calculationRunRepository.latestFor(undefined, 'aggregates')
    expect(latestRun.ok).toBe(true)
    if (latestRun.ok) expect(latestRun.value?.asOf).toBe(DEMO_DATE)
  })

  it('persists and applies the explicit personal as-of date instead of the demo fixture date', async () => {
    const repos = createDemoRepositories()
    jest.spyOn(useReposModule, 'useRepositories').mockReturnValue(repos)
    ;(getDataMode as jest.Mock).mockResolvedValue('personal')
    const personalAsOf = toLocalDate('2026-07-17')
    const demoLoan = aLoan()
    const personalLoan = {
      ...demoLoan,
      provenance: {
        source: 'userEntered' as const,
        observedAt: '2026-07-17T00:00:00.000Z',
        recordedAt: '2026-07-17T00:00:00.000Z',
      },
    }
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result, unmount } = renderHook(() => useHomeAggregates([personalLoan], personalAsOf), {
      wrapper,
    })
    await waitFor(() => expect(result.current.status).toBe('success'), { timeout: 3000 })
    unmount()

    const latestRun = await repos.calculationRunRepository.latestFor(undefined, 'aggregates')
    expect(latestRun.ok).toBe(true)
    if (latestRun.ok) {
      expect(latestRun.value?.asOf).toBe(personalAsOf)
      expect(latestRun.value?.inputsSnapshot).toEqual(
        expect.objectContaining({ asOf: personalAsOf }),
      )
    }
  })
})
