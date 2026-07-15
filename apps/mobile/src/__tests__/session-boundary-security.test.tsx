/**
 * Production-mounted cross-user leakage test (F: cache/session scoping).
 *
 * Everything security-relevant is real: AppProviders, the production
 * QueryClient, AuthBoundaryCoordinator, runLocalUserBoundaryCleanup, the
 * runtime repository replacement, the real RequireRepositories gate, the
 * notification-navigation gate, and the centralized query keys. Only the
 * Supabase transport, the router, and the OS notification layer are controlled
 * doubles.
 *
 * A → SIGNED_OUT → cleanup → B signs in (same process) → an old user-A
 * notification is processed. No user-A financial data may render or remain
 * cached.
 */
import React from 'react'
import { Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { render, waitFor, act } from '@testing-library/react-native'
import { AppProviders, usePersonalBoot } from '../providers'
import { RequireRepositories } from '../features/repositories/components/RequireRepositories'
import { obligationKeys, paymentKeys, insightKeys } from '../features/home/api/keys'
import { setDataMode } from '../features/demo/stores/demo-mode-store'
import {
  canNavigateNotificationResponse,
  enableNotificationNavigation,
} from '../services/local-notification-service'

type SupabaseSession = { user: { id: string; email?: string }; expires_at?: number } | null

// `mock`-prefixed so the hoisted jest.mock factory may reference them.
let mockCurrentSession: SupabaseSession = { user: { id: 'user-a', email: 'a@example.com' } }
let mockAuthListener: ((event: string, session: SupabaseSession) => void) | undefined

jest.mock('@/core/supabase/client', () => ({
  getSupabaseClient: () => ({
    ok: true,
    value: {
      auth: {
        getSession: async () => ({ data: { session: mockCurrentSession }, error: null }),
        onAuthStateChange: (cb: (event: string, session: SupabaseSession) => void) => {
          mockAuthListener = cb
          return { data: { subscription: { unsubscribe: jest.fn() } } }
        },
      },
      from: () => ({}),
      functions: { invoke: jest.fn() },
    },
  }),
  disposeSupabaseAuthLifecycle: () => undefined,
}))

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  Redirect: ({ href }: { href: string }) => {
    const { Text: RNText } = jest.requireActual('react-native')
    return <RNText>{`REDIRECT ${href}`}</RNText>
  },
}))

const mockClearLastNotificationResponseAsync = jest.fn().mockResolvedValue(null)
jest.mock('expo-notifications', () => ({
  clearLastNotificationResponseAsync: () => mockClearLastNotificationResponseAsync(),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
}))

const handles: { queryClient?: QueryClient; bootPersonal?: () => void } = {}

// A stable root that survives the repository-provider remount. It exposes the
// real personal boot via a handle (as the app's entry flow triggers it) and
// always renders the real RequireRepositories gate: it redirects while no
// repository family is mounted and renders the screen once boot commits one.
function Root() {
  handles.queryClient = useQueryClient()
  const boot = usePersonalBoot()
  handles.bootPersonal = () => void boot()
  return (
    <RequireRepositories>
      <Text>user-b-screen</Text>
    </RequireRepositories>
  )
}

const USER_A_DETAIL = obligationKeys.detail('user-a', 'ob-a')
const USER_A_PAYMENTS = paymentKeys.listFor('user-a', 'ob-a')
const USER_A_INSIGHTS = insightKeys.list('user-a')
const USER_B_DETAIL = obligationKeys.detail('user-b', 'ob-b')

describe('session boundary cross-user leakage', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    mockCurrentSession = { user: { id: 'user-a', email: 'a@example.com' } }
    mockAuthListener = undefined
    handles.queryClient = undefined
    handles.bootPersonal = undefined
    enableNotificationNavigation()
    await setDataMode('personal')
  })

  it('purges user-A data and blocks stale navigation across an external sign-out and a user-B sign-in', async () => {
    const view = render(
      <AppProviders>
        <Root />
      </AppProviders>,
    )

    // The real AuthBoundaryCoordinator subscribes once it confirms the personal
    // session — capture the listener it registers on the (fake) transport.
    await waitFor(() => expect(mockAuthListener).toBeDefined())
    expect(handles.queryClient).toBeDefined()
    const client = handles.queryClient as QueryClient

    // 1. User A loads cached financial detail data under real user-scoped keys.
    client.setQueryData(USER_A_DETAIL, { id: 'ob-a', principal: '50000', nextPayment: '1200' })
    client.setQueryData(USER_A_PAYMENTS, [{ id: 'p1', amount: '1200' }])
    client.setQueryData(USER_A_INSIGHTS, [{ id: 'i1', ruleId: 'RATE_INCREASED' }])
    expect(client.getQueryData(USER_A_DETAIL)).toBeDefined()

    // 2 + 3. Auth emits SIGNED_OUT; the real coordinator runs the real cleanup.
    await act(async () => {
      mockAuthListener?.('SIGNED_OUT', null)
      await Promise.resolve()
    })
    await waitFor(() => expect(client.getQueryData(USER_A_DETAIL)).toBeUndefined())
    expect(client.getQueryData(USER_A_PAYMENTS)).toBeUndefined()
    expect(client.getQueryData(USER_A_INSIGHTS)).toBeUndefined()
    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in')

    // 5 (gate). The stale OS notification response was cleared and navigation is
    // disabled, so an old user-A deep link cannot be processed.
    expect(mockClearLastNotificationResponseAsync).toHaveBeenCalledTimes(1)
    expect(canNavigateNotificationResponse()).toBe(false)

    // 4. User B signs in in the same process; the real repository provider is
    // re-installed and the real RequireRepositories gate renders its screen.
    mockCurrentSession = { user: { id: 'user-b', email: 'b@example.com' } }
    await act(async () => {
      handles.bootPersonal?.()
      await new Promise((r) => setTimeout(r, 0))
    })
    await waitFor(() => expect(view.getByText('user-b-screen')).toBeTruthy())

    // 6. No user-A financial data remains; a later user-B write stays isolated.
    client.setQueryData(USER_B_DETAIL, { id: 'ob-b', principal: '9000' })
    expect(client.getQueryData(USER_A_DETAIL)).toBeUndefined()
    expect(client.getQueryData(USER_A_PAYMENTS)).toBeUndefined()
    expect(client.getQueryData(USER_A_INSIGHTS)).toBeUndefined()
    expect(client.getQueryData(USER_B_DETAIL)).toEqual({ id: 'ob-b', principal: '9000' })
  })
})
