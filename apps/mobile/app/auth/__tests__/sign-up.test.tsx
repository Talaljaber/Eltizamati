import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ok } from '@eltizamati/domain'
import SignUpScreen from '../sign-up'
import { __resetOtpAttemptForTest, getOtpAttempt } from '@/features/auth/stores/otp-attempt-store'

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }))
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
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={client}>
      <SignUpScreen />
    </QueryClientProvider>,
  )
}

function fillValidForm(view: ReturnType<typeof renderScreen>) {
  fireEvent.changeText(view.getByTestId('sign-up-full-name'), '  Talal   Example ')
  // Country code defaults to Jordan (+962) — only the local number is typed.
  fireEvent.changeText(view.getByTestId('sign-up-phone'), '79 123 4567')
  fireEvent.press(view.getByTestId('sign-up-bank'))
  fireEvent.press(view.getByText('Arab Bank'))
  fireEvent.changeText(view.getByTestId('sign-up-email'), ' User@Example.COM ')
  fireEvent.changeText(view.getByTestId('sign-up-password'), 'strong-password')
  fireEvent.changeText(view.getByTestId('sign-up-confirm-password'), 'strong-password')
  fireEvent.press(view.getByTestId('sign-up-terms-checkbox'))
}

describe('password sign up', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetOtpAttemptForTest()
    mockAuthService.signUp.mockResolvedValue(ok(undefined))
  })

  it('collects the approved client fields and keeps the password out of ephemeral state', async () => {
    const view = renderScreen()
    fillValidForm(view)
    fireEvent.press(view.getByTestId('sign-up-submit'))
    await waitFor(() =>
      expect(mockAuthService.signUp).toHaveBeenCalledWith('user@example.com', 'strong-password'),
    )
    expect(getOtpAttempt()).toMatchObject({
      normalizedEmail: 'user@example.com',
      profile: {
        fullName: 'Talal Example',
        phoneNumber: '+962791234567',
        primaryBank: 'Arab Bank',
      },
    })
    expect(JSON.stringify(getOtpAttempt())).not.toContain('strong-password')
    expect(mockPush).toHaveBeenCalledWith('/auth/verify-code')
  })

  it('rejects mismatched passwords and invalid contact data before Supabase', () => {
    const view = renderScreen()
    fillValidForm(view)
    fireEvent.changeText(view.getByTestId('sign-up-confirm-password'), 'different-password')
    fireEvent.press(view.getByTestId('sign-up-submit'))
    expect(view.getByTestId('sign-up-validation-error')).toBeTruthy()
    expect(mockAuthService.signUp).not.toHaveBeenCalled()
  })

  it('blocks account creation until the terms & conditions are agreed to', () => {
    const view = renderScreen()
    fillValidForm(view)
    // Untick the terms checkbox that fillValidForm ticked — the submit control
    // is then disabled, so no account request can be made.
    fireEvent.press(view.getByTestId('sign-up-terms-checkbox'))
    fireEvent.press(view.getByTestId('sign-up-submit'))
    expect(mockAuthService.signUp).not.toHaveBeenCalled()
  })

  it('prevents duplicate signup requests', async () => {
    let release: (() => void) | undefined
    mockAuthService.signUp.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(ok(undefined))
      }),
    )
    const view = renderScreen()
    fillValidForm(view)
    fireEvent.press(view.getByTestId('sign-up-submit'))
    fireEvent.press(view.getByTestId('sign-up-submit'))
    await waitFor(() => expect(mockAuthService.signUp).toHaveBeenCalledTimes(1))
    release?.()
  })
})
