import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react-native'
import { ok } from '@eltizamati/domain'
import { AuthBoundaryCoordinator } from '../AuthBoundaryCoordinator'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))

const mockGetDataMode = jest.fn()
const mockClearDataMode = jest.fn()
jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  getDataMode: () => mockGetDataMode(),
  clearDataMode: () => mockClearDataMode(),
}))

const mockClearConsent = jest.fn()
jest.mock('@/features/consent/consent-policy', () => ({
  clearLocalConsent: () => mockClearConsent(),
}))

const mockCancelReminder = jest.fn()
const mockClearNotificationResponse = jest.fn()
jest.mock('@/services/local-notification-service', () => ({
  cancelLocalReminder: () => mockCancelReminder(),
  clearLastNotificationResponse: () => mockClearNotificationResponse(),
}))

const mockResetRuntime = jest.fn()
jest.mock('@/providers', () => ({ useResetAppRuntimeIfAvailable: () => mockResetRuntime }))

const mockGetAuthService = jest.fn()
jest.mock('@/features/auth/hooks/use-auth-service', () => ({
  useAuthServiceLazy: () => mockGetAuthService,
}))

describe('AuthBoundaryCoordinator', () => {
  let authListener:
    ((event: string, session: { user: { id: string } } | undefined) => void) | undefined
  let queryClient: QueryClient

  beforeEach(() => {
    jest.clearAllMocks()
    authListener = undefined
    queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    mockGetDataMode.mockResolvedValue('personal')
    mockClearDataMode.mockResolvedValue(undefined)
    mockClearConsent.mockResolvedValue(undefined)
    mockCancelReminder.mockResolvedValue(undefined)
    mockClearNotificationResponse.mockResolvedValue(undefined)
    mockGetAuthService.mockReturnValue(
      ok({
        currentSession: jest.fn().mockResolvedValue(ok({ user: { id: 'user-a' } })),
        onAuthStateChange: jest.fn((listener) => {
          authListener = listener
          return jest.fn()
        }),
      }),
    )
  })

  afterEach(() => queryClient.clear())

  it('clears user-A cache and blocks stale notification navigation after external SIGNED_OUT', async () => {
    queryClient.setQueryData(['obligation', 'user-a', 'obligation-a'], { owner: 'user-a' })
    render(
      <QueryClientProvider client={queryClient}>
        <AuthBoundaryCoordinator />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(authListener).toBeDefined())
    authListener?.('signedOut', undefined)

    await waitFor(() =>
      expect(queryClient.getQueryData(['obligation', 'user-a', 'obligation-a'])).toBeUndefined(),
    )
    expect(mockClearNotificationResponse).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in')
  })

  it('is idempotent for repeated signed-out events and leaves no cache for a later user', async () => {
    queryClient.setQueryData(['obligation', 'user-a', 'obligation-a'], { owner: 'user-a' })
    render(
      <QueryClientProvider client={queryClient}>
        <AuthBoundaryCoordinator />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(authListener).toBeDefined())
    authListener?.('SIGNED_OUT', undefined)
    authListener?.('SIGNED_OUT', undefined)

    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0))
    expect(mockClearNotificationResponse).toHaveBeenCalledTimes(1)
    queryClient.setQueryData(['obligation', 'user-b', 'obligation-b'], { owner: 'user-b' })
    expect(queryClient.getQueryData(['obligation', 'user-a', 'obligation-a'])).toBeUndefined()
    expect(queryClient.getQueryData(['obligation', 'user-b', 'obligation-b'])).toEqual({
      owner: 'user-b',
    })
  })

  it('cleans the old boundary when the listener reports a different authenticated user', async () => {
    queryClient.setQueryData(['payments', 'user-a', 'obligation-a'], [{ owner: 'user-a' }])
    render(
      <QueryClientProvider client={queryClient}>
        <AuthBoundaryCoordinator />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(authListener).toBeDefined())
    authListener?.('TOKEN_REFRESHED', { user: { id: 'user-b' } })

    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0))
    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in')
  })
})
