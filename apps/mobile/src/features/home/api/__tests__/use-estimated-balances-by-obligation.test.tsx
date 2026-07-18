import React from 'react'
import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEstimatedBalancesByObligation } from '../use-estimated-balances-by-obligation'
import { createDemoRepositories } from '@/services/repositories/demo'
import { ImportService } from '@/services/import-service'
import { DemoSeedProvider } from '@/services/demo-seed-provider'
import { DEMO_DATE } from '@eltizamati/demo-data'
import { Money } from '@eltizamati/domain'

describe('useEstimatedBalancesByObligation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('estimates a balance for a conventional loan with no official outstandingBalance on file', async () => {
    const repos = createDemoRepositories()
    const seed = new DemoSeedProvider().provide()
    await new ImportService().importDemoSeed(seed, repos)

    const loanWithNoOfficialBalance = {
      ...seed.loan,
      loanDetails: { ...seed.loan.loanDetails, outstandingBalance: undefined },
    }

    const { result } = renderHook(
      () =>
        useEstimatedBalancesByObligation(
          repos.ratePeriodRepository,
          repos.calculationRunRepository,
          [loanWithNoOfficialBalance, seed.murabaha, seed.card],
          seed.userId,
          DEMO_DATE,
        ),
      { wrapper },
    )

    await waitFor(() => expect(result.current.get(loanWithNoOfficialBalance.id)).toBeDefined())

    const estimate = result.current.get(loanWithNoOfficialBalance.id)
    expect(estimate?.value.isPositive()).toBe(true)
    expect(estimate?.provenance.source).toBe('estimate')
    // Murabaha/card never resolve through this fallback — extractOfficialBalance
    // returning undefined for murabaha is by design, not a gap to fill in here.
    expect(result.current.has(seed.murabaha.id)).toBe(false)
  })

  it('does not query obligations that already have an official balance', async () => {
    const repos = createDemoRepositories()
    const seed = new DemoSeedProvider().provide()
    await new ImportService().importDemoSeed(seed, repos)

    const loanWithOfficialBalance = {
      ...seed.loan,
      loanDetails: {
        ...seed.loan.loanDetails,
        outstandingBalance: {
          value: Money.of('9999', 'JOD'),
          provenance: {
            source: 'userEntered' as const,
            observedAt: '2026-07-01T00:00:00.000Z',
            recordedAt: '2026-07-01T00:00:00.000Z',
          },
        },
      },
    }

    const { result } = renderHook(
      () =>
        useEstimatedBalancesByObligation(
          repos.ratePeriodRepository,
          repos.calculationRunRepository,
          [loanWithOfficialBalance],
          seed.userId,
          DEMO_DATE,
        ),
      { wrapper },
    )

    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(result.current.size).toBe(0)
  })
})
