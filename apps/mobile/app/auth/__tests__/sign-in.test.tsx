/**
 * SCR-AUTH-SIGNIN component tests — loading/error/offline states, the
 * "continue in demo mode" secondary action, and the sign-up/reset links.
 */
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ok, err, makeError } from '@eltizamati/domain'
import SignInScreen from '../sign-in'

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}))

const mockBootDemoMode = jest.fn().mockResolvedValue(undefined)
const mockBootPersonalMode = jest.fn().mockResolvedValue(undefined)
jest.mock('@/providers', () => ({
  useDemoBoot: () => mockBootDemoMode,
  usePersonalBoot: () => mockBootPersonalMode,
}))

const mockCompleteDemoEntry = jest.fn()
const mockCompletePersonalEntry = jest.fn()
jest.mock('@/features/consent/hooks/use-entry-completion', () => ({
  useEntryCompletion: () => ({
    completeDemoEntry: mockCompleteDemoEntry,
    completePersonalEntry: mockCompletePersonalEntry,
  }),
}))

jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  setOnboardingComplete: jest.fn().mockResolvedValue(undefined),
  setDataMode: jest.fn().mockResolvedValue(undefined),
}))

const mockAuthService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  currentSession: jest.fn(),
  onAuthStateChange: jest.fn(),
}
const mockConsentRepo = { status: jest.fn(), acknowledge: jest.fn() }

jest.mock('@/features/auth/hooks/use-auth-service', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ok: okFn } = require('@eltizamati/domain')
  return {
    useAuthService: () => okFn(mockAuthService),
    useConsentRepository: () => okFn(mockConsentRepo),
  }
})

const fakeSession = { user: { id: 'user-1', email: 'a@b.com' }, expiresAt: undefined }

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <SignInScreen />
    </QueryClientProvider>,
  )
}

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthService.signIn.mockResolvedValue(ok(fakeSession))
    mockCompleteDemoEntry.mockResolvedValue(ok(true))
    mockCompletePersonalEntry.mockResolvedValue(ok(true))
  })

  it('renders the form fields and submit button', () => {
    const { getByTestId } = renderScreen()
    expect(getByTestId('sign-in-email')).toBeTruthy()
    expect(getByTestId('sign-in-password')).toBeTruthy()
    expect(getByTestId('sign-in-submit')).toBeTruthy()
  })

  it('disables submit until both fields are filled', () => {
    const { getByTestId } = renderScreen()
    const submit = getByTestId('sign-in-submit')
    expect(submit.props.accessibilityState.disabled).toBe(true)

    fireEvent.changeText(getByTestId('sign-in-email'), 'a@b.com')
    expect(submit.props.accessibilityState.disabled).toBe(true)

    fireEvent.changeText(getByTestId('sign-in-password'), 'secret')
    expect(submit.props.accessibilityState.disabled).toBe(false)
  })

  it('on success, delegates all consent and terminal routing to the entry policy', async () => {
    const { getByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('sign-in-email'), 'a@b.com')
    fireEvent.changeText(getByTestId('sign-in-password'), 'secret')
    fireEvent.press(getByTestId('sign-in-submit'))

    await waitFor(() => expect(mockCompletePersonalEntry).toHaveBeenCalledWith(fakeSession))
  })

  it('on a consent-recording failure, does not navigate', async () => {
    mockCompletePersonalEntry.mockResolvedValue(err(makeError('unexpected', {})))
    const { getByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('sign-in-email'), 'a@b.com')
    fireEvent.changeText(getByTestId('sign-in-password'), 'secret')
    fireEvent.press(getByTestId('sign-in-submit'))

    await waitFor(() => expect(mockCompletePersonalEntry).toHaveBeenCalled())
    expect(getByTestId('sign-in-submit-error')).toBeTruthy()
  })

  it('shows an inline error (form still visible) for a non-connectivity failure', async () => {
    mockAuthService.signIn.mockResolvedValue(err(makeError('auth', {})))
    const { getByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('sign-in-email'), 'a@b.com')
    fireEvent.changeText(getByTestId('sign-in-password'), 'wrong')
    fireEvent.press(getByTestId('sign-in-submit'))

    await waitFor(() => expect(getByTestId('sign-in-error')).toBeTruthy())
    expect(getByTestId('sign-in-email')).toBeTruthy() // form still visible, not replaced
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('replaces the whole screen with the offline surface on a connectivity error', async () => {
    mockAuthService.signIn.mockResolvedValue(err(makeError('connectivity', {})))
    const { getByTestId, queryByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('sign-in-email'), 'a@b.com')
    fireEvent.changeText(getByTestId('sign-in-password'), 'secret')
    fireEvent.press(getByTestId('sign-in-submit'))

    await waitFor(() => expect(getByTestId('sign-in-offline')).toBeTruthy())
    expect(queryByTestId('sign-in-submit')).toBeNull()
  })

  it('"continue in demo mode" delegates to the same consent-gated entry policy', async () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('sign-in-continue-demo'))

    await waitFor(() => expect(mockCompleteDemoEntry).toHaveBeenCalledTimes(1))
  })

  it('navigates to reset/sign-up via the link texts', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('sign-in-forgot-password'))
    expect(mockPush).toHaveBeenCalledWith('/auth/reset')

    fireEvent.press(getByTestId('sign-in-create-account'))
    expect(mockPush).toHaveBeenCalledWith('/auth/sign-up')
  })
})
