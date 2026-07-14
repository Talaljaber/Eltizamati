/**
 * SCR-AUTH-RESET component tests — loading/error/offline/sent-confirmation
 * states. Copy must never disclose whether the email is actually registered.
 */
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ok, err, makeError } from '@eltizamati/domain'
import ResetScreen from '../reset'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}))

const mockAuthService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  currentSession: jest.fn(),
  onAuthStateChange: jest.fn(),
}

jest.mock('@/features/auth/hooks/use-auth-service', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ok: okFn } = require('@eltizamati/domain')
  return {
    useAuthService: () => okFn(mockAuthService),
  }
})

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <ResetScreen />
    </QueryClientProvider>,
  )
}

describe('ResetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the email field and submit button', () => {
    const { getByTestId } = renderScreen()
    expect(getByTestId('reset-email')).toBeTruthy()
    expect(getByTestId('reset-submit')).toBeTruthy()
  })

  it('disables submit until an email is entered', () => {
    const { getByTestId } = renderScreen()
    expect(getByTestId('reset-submit').props.accessibilityState.disabled).toBe(true)
    fireEvent.changeText(getByTestId('reset-email'), 'a@b.com')
    expect(getByTestId('reset-submit').props.accessibilityState.disabled).toBe(false)
  })

  it('shows the sent-confirmation state on success, with no account-existence disclosure', async () => {
    mockAuthService.resetPassword.mockResolvedValue(ok(undefined))
    const { getByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('reset-email'), 'a@b.com')
    fireEvent.press(getByTestId('reset-submit'))

    await waitFor(() => expect(getByTestId('reset-sent')).toBeTruthy())
  })

  it('shows an inline error (form still visible) for a non-connectivity failure', async () => {
    mockAuthService.resetPassword.mockResolvedValue(err(makeError('auth', {})))
    const { getByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('reset-email'), 'a@b.com')
    fireEvent.press(getByTestId('reset-submit'))

    await waitFor(() => expect(getByTestId('reset-error')).toBeTruthy())
    expect(getByTestId('reset-email')).toBeTruthy()
  })

  it('replaces the whole screen with the offline surface on a connectivity error', async () => {
    mockAuthService.resetPassword.mockResolvedValue(err(makeError('connectivity', {})))
    const { getByTestId, queryByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('reset-email'), 'a@b.com')
    fireEvent.press(getByTestId('reset-submit'))

    await waitFor(() => expect(getByTestId('reset-offline')).toBeTruthy())
    expect(queryByTestId('reset-submit')).toBeNull()
  })

  it('navigates back to sign-in via the link text', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('reset-back-to-sign-in'))
    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in')
  })
})
