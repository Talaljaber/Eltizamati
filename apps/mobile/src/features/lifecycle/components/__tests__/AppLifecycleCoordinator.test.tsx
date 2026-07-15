import React from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { render, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLifecycleCoordinator } from '../AppLifecycleCoordinator'

const mockGetDataMode = jest.fn()
jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  getDataMode: () => mockGetDataMode(),
}))

const mockRefreshDate = jest.fn()
jest.mock('@/services/calculation-as-of-context', () => ({
  useRefreshPersonalCalculationAsOf: () => mockRefreshDate,
}))

describe('AppLifecycleCoordinator', () => {
  let handler: ((state: AppStateStatus) => void) | undefined
  let remove: jest.Mock
  let queryClient: QueryClient

  beforeEach(() => {
    jest.clearAllMocks()
    handler = undefined
    remove = jest.fn()
    queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      handler = listener
      return { remove } as never
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    queryClient.clear()
  })

  function renderCoordinator() {
    return render(
      <QueryClientProvider client={queryClient}>
        <AppLifecycleCoordinator />
      </QueryClientProvider>,
    )
  }

  it('refreshes the shared date but never invalidates Supabase data in demo mode', async () => {
    mockGetDataMode.mockResolvedValue('demo')
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    renderCoordinator()

    handler?.('background')
    handler?.('active')
    await waitFor(() => expect(mockGetDataMode).toHaveBeenCalled())

    expect(mockRefreshDate).toHaveBeenCalledTimes(1)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('performs one controlled active-query invalidation on personal foreground', async () => {
    mockGetDataMode.mockResolvedValue('personal')
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    renderCoordinator()

    handler?.('background')
    handler?.('active')
    handler?.('active')
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1))

    expect(invalidate).toHaveBeenCalledWith({ refetchType: 'active' })
  })

  it('removes its listener on unmount', () => {
    const view = renderCoordinator()
    view.unmount()
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
