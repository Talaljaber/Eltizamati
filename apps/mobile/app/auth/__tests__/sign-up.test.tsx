/**
 * SCR-AUTH-SIGNUP component tests — loading/error/offline states and the
 * verification-pending state (no session invented when one isn't returned).
 */
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ok, err, makeError } from '@eltizamati/domain'
import SignUpScreen from '../sign-up'

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}))

jest.mock('@/features/demo/stores/demo-mode-store', () => ({
  setOnboardingComplete: jest.fn().mockResolvedValue(undefined),
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
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SignUpScreen />
    </QueryClientProvider>,
  )
}

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConsentRepo.acknowledge.mockResolvedValue(ok({}))
  })

  it('renders the form fields and submit button', () => {
    const { getByTestId } = renderScreen()
    expect(getByTestId('sign-up-email')).toBeTruthy()
    expect(getByTestId('sign-up-password')).toBeTruthy()
    expect(getByTestId('sign-up-submit')).toBeTruthy()
  })

  it('shows verification-pending (not a session) when signUp resolves without a session', async () => {
    mockAuthService.signUp.mockResolvedValue(ok(undefined))
    const { getByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('sign-up-email'), 'new@example.com')
    fireEvent.changeText(getByTestId('sign-up-password'), 'secret123')
    fireEvent.press(getByTestId('sign-up-submit'))

    await waitFor(() => expect(getByTestId('sign-up-verification-pending')).toBeTruthy())
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/')
  })

  it('on a returned session, records consent and navigates to the tabs root', async () => {
    mockAuthService.signUp.mockResolvedValue(ok(fakeSession))
    const { getByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('sign-up-email'), 'new@example.com')
    fireEvent.changeText(getByTestId('sign-up-password'), 'secret123')
    fireEvent.press(getByTestId('sign-up-submit'))

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/'))
    expect(mockConsentRepo.acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    )
  })

  it('shows an inline error (form still visible) for a non-connectivity failure', async () => {
    mockAuthService.signUp.mockResolvedValue(err(makeError('validation', {})))
    const { getByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('sign-up-email'), 'taken@example.com')
    fireEvent.changeText(getByTestId('sign-up-password'), 'secret123')
    fireEvent.press(getByTestId('sign-up-submit'))

    await waitFor(() => expect(getByTestId('sign-up-error')).toBeTruthy())
    expect(getByTestId('sign-up-email')).toBeTruthy()
  })

  it('replaces the whole screen with the offline surface on a connectivity error', async () => {
    mockAuthService.signUp.mockResolvedValue(err(makeError('connectivity', {})))
    const { getByTestId, queryByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('sign-up-email'), 'a@b.com')
    fireEvent.changeText(getByTestId('sign-up-password'), 'secret123')
    fireEvent.press(getByTestId('sign-up-submit'))

    await waitFor(() => expect(getByTestId('sign-up-offline')).toBeTruthy())
    expect(queryByTestId('sign-up-submit')).toBeNull()
  })

  it('navigates to sign-in via the link text', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('sign-up-sign-in'))
    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in')
  })
})
