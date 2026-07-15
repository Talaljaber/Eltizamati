import React from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { err, makeError, ok } from '@eltizamati/domain'
import VerifyCodeScreen from '../verify-code'
import {
  __resetOtpAttemptForTest,
  getOtpAttempt,
  startOtpAttempt,
} from '@/features/auth/stores/otp-attempt-store'

const mockReplace = jest.fn()
const mockBack = jest.fn()
const mockCompletePersonalEntry = jest.fn()
const mockResumePersonalEntry = jest.fn()
jest.mock('expo-router', () => ({
  Redirect: () => null,
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}))

jest.mock('@/features/consent/hooks/use-entry-completion', () => ({
  useEntryCompletion: () => ({
    completePersonalEntry: mockCompletePersonalEntry,
    resumePersonalEntry: mockResumePersonalEntry,
  }),
}))

const session = { user: { id: 'user-1', email: 'user@example.com' }, expiresAt: undefined }
let storedProfile: unknown
const mockProfileRepository = {
  get: jest.fn(async () =>
    storedProfile === undefined ? err(makeError('notFound')) : ok(storedProfile),
  ),
  createIfAbsent: jest.fn(async (profile) => {
    storedProfile = profile
    return ok(profile)
  }),
  save: jest.fn(),
}
const mockAuthService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  resendSignupOtp: jest.fn(),
  verifySignupOtp: jest.fn(),
  signOut: jest.fn(),
  clearLocalSession: jest.fn(),
  currentSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  deleteAccount: jest.fn(),
}
jest.mock('@/features/auth/hooks/use-auth-service', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ok: okResult } = require('@eltizamati/domain')
  return {
    useAuthService: () => okResult(mockAuthService),
    usePersonalRepositoriesLazy: () => () =>
      okResult({ userProfileRepository: mockProfileRepository }),
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
      <VerifyCodeScreen />
    </QueryClientProvider>,
  )
}

describe('VerifyCodeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storedProfile = undefined
    __resetOtpAttemptForTest()
    startOtpAttempt('user@example.com', {
      fullName: 'User Example',
      phoneNumber: '+962791234567',
      primaryBank: 'Example Bank',
    })
    mockAuthService.verifySignupOtp.mockResolvedValue(ok(session))
    mockAuthService.resendSignupOtp.mockResolvedValue(ok(undefined))
    mockAuthService.signOut.mockResolvedValue(ok(undefined))
    mockAuthService.currentSession.mockResolvedValue(ok(session))
    mockCompletePersonalEntry.mockResolvedValue(ok(true))
    mockResumePersonalEntry.mockResolvedValue(ok(true))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows only a masked email and verifies the eight-digit code', async () => {
    const view = renderScreen()
    expect(JSON.stringify(view.toJSON())).not.toContain('user@example.com')
    expect(getOtpAttempt()?.maskedEmail).toBe('u***r@e***e.com')

    fireEvent.changeText(view.getByTestId('verify-code-input'), '12345678')
    fireEvent.press(view.getByTestId('verify-code-submit'))

    await waitFor(() =>
      expect(mockAuthService.verifySignupOtp).toHaveBeenCalledWith('user@example.com', '12345678'),
    )
    expect(mockCompletePersonalEntry).toHaveBeenCalledWith(
      session,
      expect.objectContaining({
        fullName: 'User Example',
        phoneNumber: '+962791234567',
        primaryBank: 'Example Bank',
      }),
    )
    expect(mockAuthService.signOut).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalledWith('/auth/sign-in')
    expect(getOtpAttempt()).toBeUndefined()
  })

  it('keeps the user on screen for invalid and expired codes', async () => {
    mockAuthService.verifySignupOtp.mockResolvedValue(
      err(
        makeError('auth', {
          safeMetadata: { authErrorCode: 'invalid_otp', otpFailure: 'invalid' },
        }),
      ),
    )
    const view = renderScreen()
    fireEvent.changeText(view.getByTestId('verify-code-input'), '12345678')
    fireEvent.press(view.getByTestId('verify-code-submit'))

    await waitFor(() => expect(view.getByTestId('verify-code-error')).toBeTruthy())
    expect(mockCompletePersonalEntry).not.toHaveBeenCalled()
    expect(getOtpAttempt()).toBeDefined()
  })

  it('enforces resend cooldown and allows resend when it expires', async () => {
    jest.useFakeTimers()
    const view = renderScreen()
    expect(view.getByTestId('verify-code-resend').props.accessibilityState.disabled).toBe(true)

    act(() => jest.advanceTimersByTime(61_000))
    expect(view.getByTestId('verify-code-resend').props.accessibilityState.disabled).toBe(false)
    fireEvent.changeText(view.getByTestId('verify-code-input'), '87654321')
    fireEvent.press(view.getByTestId('verify-code-resend'))
    await waitFor(() =>
      expect(mockAuthService.resendSignupOtp).toHaveBeenCalledWith('user@example.com'),
    )
    expect(view.getByTestId('verify-code-input').props.value).toBe('')
    expect(view.getByTestId('verify-code-resend-success')).toBeTruthy()
    view.unmount()
  })

  it('prevents racing verification submissions', async () => {
    let release: (() => void) | undefined
    mockAuthService.verifySignupOtp.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(ok(session))
      }),
    )
    const view = renderScreen()
    fireEvent.changeText(view.getByTestId('verify-code-input'), '12345678')
    fireEvent.press(view.getByTestId('verify-code-submit'))
    fireEvent.press(view.getByTestId('verify-code-submit'))

    await waitFor(() => expect(mockAuthService.verifySignupOtp).toHaveBeenCalledTimes(1))
    release?.()
    await waitFor(() => expect(mockCompletePersonalEntry).toHaveBeenCalled())
  })

  it('retries profile provisioning from the verified session without reusing the OTP', async () => {
    mockCompletePersonalEntry
      .mockResolvedValueOnce(err(makeError('storage')))
      .mockResolvedValueOnce(ok(true))
    const view = renderScreen()
    fireEvent.changeText(view.getByTestId('verify-code-input'), '12345678')
    fireEvent.press(view.getByTestId('verify-code-submit'))

    await waitFor(() => expect(view.getByTestId('verify-code-entry-error')).toBeTruthy())
    expect(view.getByTestId('verify-code-email-verified')).toBeTruthy()
    expect(view.queryByTestId('verify-code-submit')).toBeNull()
    expect(view.queryByTestId('verify-code-resend')).toBeNull()
    fireEvent.press(view.getByTestId('verify-code-entry-retry'))

    expect(mockAuthService.verifySignupOtp).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(mockCompletePersonalEntry).toHaveBeenCalledTimes(2))
    expect(mockResumePersonalEntry).not.toHaveBeenCalled()
    expect(mockAuthService.signOut).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalledWith('/auth/sign-in')
    expect(getOtpAttempt()).toBeUndefined()
  })

  it('clears the ephemeral attempt when changing email', () => {
    const view = renderScreen()
    fireEvent.press(view.getByTestId('verify-code-change-email'))

    expect(getOtpAttempt()).toBeUndefined()
    expect(mockBack).toHaveBeenCalledTimes(1)
    expect(mockReplace).not.toHaveBeenCalledWith('/auth/sign-up')
  })

  it('uses OTP autofill semantics and stable LTR numeric entry under RTL', () => {
    const input = renderScreen().getByTestId('verify-code-input')
    expect(input.props.textContentType).toBe('oneTimeCode')
    expect(input.props.autoComplete).toBe('one-time-code')
    expect(input.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          writingDirection: 'ltr',
          textAlign: 'center',
        }),
      ]),
    )
  })
})
