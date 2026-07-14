import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ok } from '@eltizamati/domain'
import UpdatePasswordScreen from '../update-password'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}))

const fakeSession = { user: { id: 'user-1', email: 'user@example.com' }, expiresAt: undefined }
const mockAuthService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  clearLocalSession: jest.fn().mockResolvedValue(ok(undefined)),
  resetPassword: jest.fn(),
  currentSession: jest.fn().mockResolvedValue(ok(fakeSession)),
  onAuthStateChange: jest.fn(),
  exchangeCallbackUrl: jest.fn(),
  updatePassword: jest.fn().mockResolvedValue(ok(undefined)),
  deleteAccount: jest.fn(),
}

jest.mock('@/features/auth/hooks/use-auth-service', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ok: okResult } = require('@eltizamati/domain')
  return { useAuthService: () => okResult(mockAuthService) }
})

const mockCompletePersonalEntry = jest.fn().mockResolvedValue(ok(true))
jest.mock('@/features/consent/hooks/use-entry-completion', () => ({
  useEntryCompletion: () => ({ completePersonalEntry: mockCompletePersonalEntry }),
}))

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <UpdatePasswordScreen />
    </QueryClientProvider>,
  )
}

describe('UpdatePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthService.currentSession.mockResolvedValue(ok(fakeSession))
    mockAuthService.updatePassword.mockResolvedValue(ok(undefined))
    mockAuthService.clearLocalSession.mockResolvedValue(ok(undefined))
    mockCompletePersonalEntry.mockResolvedValue(ok(true))
  })

  it('rejects weak and mismatched passwords before calling Supabase', async () => {
    const { getByTestId } = renderScreen()
    await waitFor(() => expect(getByTestId('update-password-new')).toBeTruthy())
    fireEvent.changeText(getByTestId('update-password-new'), 'short')
    fireEvent.changeText(getByTestId('update-password-confirm'), 'short')
    fireEvent.press(getByTestId('update-password-submit'))
    expect(getByTestId('update-password-validation-error')).toBeTruthy()

    fireEvent.changeText(getByTestId('update-password-new'), 'strong-pass')
    fireEvent.changeText(getByTestId('update-password-confirm'), 'different-pass')
    fireEvent.press(getByTestId('update-password-submit'))
    expect(mockAuthService.updatePassword).not.toHaveBeenCalled()
  })

  it('updates the password and runs consent completion before product entry', async () => {
    const { getByTestId, getByText } = renderScreen()
    await waitFor(() => expect(getByTestId('update-password-new')).toBeTruthy())
    fireEvent.changeText(getByTestId('update-password-new'), 'strong-pass')
    fireEvent.changeText(getByTestId('update-password-confirm'), 'strong-pass')
    fireEvent.press(getByTestId('update-password-submit'))

    await waitFor(() => expect(getByTestId('update-password-success')).toBeTruthy())
    expect(mockAuthService.updatePassword).toHaveBeenCalledWith('strong-pass')
    fireEvent.press(getByText('common.continue'))
    await waitFor(() => expect(mockCompletePersonalEntry).toHaveBeenCalledWith(fakeSession))
  })

  it('shows a recoverable terminal state for a missing or expired session', async () => {
    mockAuthService.currentSession.mockResolvedValue(ok(undefined))
    const { getByTestId } = renderScreen()

    await waitFor(() => expect(getByTestId('update-password-invalid-session')).toBeTruthy())
    expect(mockAuthService.updatePassword).not.toHaveBeenCalled()
  })

  it('clears the recovery session when the user cancels', async () => {
    const { getByTestId } = renderScreen()
    await waitFor(() => expect(getByTestId('update-password-new')).toBeTruthy())
    fireEvent.press(getByTestId('update-password-cancel'))

    await waitFor(() => expect(mockAuthService.clearLocalSession).toHaveBeenCalled())
    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in')
  })
})
