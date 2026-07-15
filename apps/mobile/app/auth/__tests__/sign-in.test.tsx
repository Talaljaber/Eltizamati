import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { err, makeError, ok } from '@eltizamati/domain'
import SignInScreen from '../sign-in'
import { __resetOtpAttemptForTest } from '@/features/auth/stores/otp-attempt-store'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }))
const mockCompleteDemoEntry = jest.fn()
const mockCompletePersonalEntry = jest.fn()
jest.mock('@/features/consent/hooks/use-entry-completion', () => ({
  useEntryCompletion: () => ({
    completeDemoEntry: mockCompleteDemoEntry,
    completePersonalEntry: mockCompletePersonalEntry,
  }),
}))

const session = { user: { id: 'user-1', email: 'user@example.com' }, expiresAt: undefined }
const mockAuthService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  verifySignupOtp: jest.fn(),
  resendSignupOtp: jest.fn(),
  signOut: jest.fn(),
  clearLocalSession: jest.fn(),
  currentSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  deleteAccount: jest.fn(),
}
jest.mock('@/features/auth/hooks/use-auth-service', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ok: okResult } = require('@eltizamati/domain')
  return { useAuthService: () => okResult(mockAuthService) }
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
      <SignInScreen />
    </QueryClientProvider>,
  )
}

describe('password sign in', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetOtpAttemptForTest()
    mockAuthService.signIn.mockResolvedValue(ok(session))
    mockCompletePersonalEntry.mockResolvedValue(ok(true))
    mockCompleteDemoEntry.mockResolvedValue(ok(true))
  })

  it('renders email and password and links to sign up', () => {
    const view = renderScreen()
    expect(view.getByTestId('sign-in-email')).toBeTruthy()
    expect(view.getByTestId('sign-in-password').props.secureTextEntry).toBe(true)
    fireEvent.press(view.getByTestId('sign-in-create-account'))
    expect(mockPush).toHaveBeenCalledWith('/auth/sign-up')
  })

  it('renders Face ID and Sanad as preview-only sign-in choices', () => {
    const view = renderScreen()
    expect(view.getByTestId('sign-in-face-id')).toBeTruthy()
    expect(view.getByTestId('sign-in-sanad')).toBeTruthy()
  })

  it('normalizes email, signs in with password, and completes personal entry without OTP', async () => {
    const view = renderScreen()
    fireEvent.changeText(view.getByTestId('sign-in-email'), ' User@Example.COM ')
    fireEvent.changeText(view.getByTestId('sign-in-password'), 'secret-password')
    fireEvent.press(view.getByTestId('sign-in-submit'))
    await waitFor(() =>
      expect(mockAuthService.signIn).toHaveBeenCalledWith('user@example.com', 'secret-password'),
    )
    expect(mockCompletePersonalEntry).toHaveBeenCalledWith(session)
    expect(mockAuthService.verifySignupOtp).not.toHaveBeenCalled()
  })

  it('shows offline and unverified-email errors honestly', async () => {
    mockAuthService.signIn.mockResolvedValueOnce(err(makeError('connectivity')))
    const offline = renderScreen()
    fireEvent.changeText(offline.getByTestId('sign-in-email'), 'user@example.com')
    fireEvent.changeText(offline.getByTestId('sign-in-password'), 'password')
    fireEvent.press(offline.getByTestId('sign-in-submit'))
    await waitFor(() => expect(offline.getByTestId('sign-in-offline')).toBeTruthy())
    offline.unmount()

    mockAuthService.signIn.mockResolvedValueOnce(
      err(makeError('auth', { safeMetadata: { reason: 'email_not_confirmed' } })),
    )
    const unverified = renderScreen()
    fireEvent.changeText(unverified.getByTestId('sign-in-email'), 'user@example.com')
    fireEvent.changeText(unverified.getByTestId('sign-in-password'), 'password')
    fireEvent.press(unverified.getByTestId('sign-in-submit'))
    await waitFor(() => expect(unverified.getByTestId('sign-in-error')).toBeTruthy())
  })

  it('keeps demo entry independent of Supabase', async () => {
    const view = renderScreen()
    fireEvent.press(view.getByTestId('sign-in-continue-demo'))
    await waitFor(() => expect(mockCompleteDemoEntry).toHaveBeenCalledTimes(1))
    expect(mockAuthService.signIn).not.toHaveBeenCalled()
  })
})
