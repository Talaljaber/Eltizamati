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
jest.mock('@/providers', () => ({
  useDemoBoot: () => mockBootDemoMode,
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
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
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
    mockConsentRepo.acknowledge.mockResolvedValue(ok({}))
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

  it('on success, records consent and navigates to the tabs root', async () => {
    const { getByTestId } = renderScreen()
    fireEvent.changeText(getByTestId('sign-in-email'), 'a@b.com')
    fireEvent.changeText(getByTestId('sign-in-password'), 'secret')
    fireEvent.press(getByTestId('sign-in-submit'))

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/'))
    expect(mockConsentRepo.acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', docType: 'privacy-policy', version: 'v1' }),
    )
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

  it('"continue in demo mode" sets demo data mode, boots demo mode, and navigates without requiring credentials', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setDataMode, setOnboardingComplete } = require('@/features/demo/stores/demo-mode-store')
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('sign-in-continue-demo'))

    await waitFor(() => expect(mockBootDemoMode).toHaveBeenCalledTimes(1))
    expect(setDataMode).toHaveBeenCalledWith('demo')
    expect(setDataMode.mock.invocationCallOrder[0]).toBeLessThan(
      setOnboardingComplete.mock.invocationCallOrder[0],
    )
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/')
  })

  it('navigates to reset/sign-up via the link texts', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('sign-in-forgot-password'))
    expect(mockPush).toHaveBeenCalledWith('/auth/reset')

    fireEvent.press(getByTestId('sign-in-create-account'))
    expect(mockPush).toHaveBeenCalledWith('/auth/sign-up')
  })
})
