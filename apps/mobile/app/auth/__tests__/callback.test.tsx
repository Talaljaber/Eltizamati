import React from 'react'
import { render, waitFor } from '@testing-library/react-native'
import { err, makeError, ok } from '@eltizamati/domain'
import AuthCallbackScreen from '../callback'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}))

const mockUseURL = jest.fn()
const mockGetInitialURL = jest.fn()
jest.mock('expo-linking', () => ({
  useURL: () => mockUseURL(),
  getInitialURL: () => mockGetInitialURL(),
}))

const fakeSession = { user: { id: 'user-1', email: 'user@example.com' }, expiresAt: undefined }
const mockExchangeCallbackUrl = jest.fn()
jest.mock('@/features/auth/hooks/use-auth-service', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ok: okResult } = require('@eltizamati/domain')
  return { useAuthService: () => okResult({ exchangeCallbackUrl: mockExchangeCallbackUrl }) }
})

const mockCompletePersonalEntry = jest.fn()
jest.mock('@/features/consent/hooks/use-entry-completion', () => ({
  useEntryCompletion: () => ({ completePersonalEntry: mockCompletePersonalEntry }),
}))

describe('AuthCallbackScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseURL.mockReturnValue('eltizamati://auth/callback?code=code')
    mockGetInitialURL.mockResolvedValue(null)
    mockCompletePersonalEntry.mockResolvedValue(ok(true))
  })

  it('routes a recovery callback to the dedicated password screen', async () => {
    mockExchangeCallbackUrl.mockResolvedValue(
      ok({ kind: 'passwordRecovery', session: fakeSession }),
    )
    render(<AuthCallbackScreen />)

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/update-password'))
    expect(mockCompletePersonalEntry).not.toHaveBeenCalled()
  })

  it('sends an ordinary callback through the centralized consent policy', async () => {
    mockExchangeCallbackUrl.mockResolvedValue(ok({ kind: 'authentication', session: fakeSession }))
    render(<AuthCallbackScreen />)

    await waitFor(() => expect(mockCompletePersonalEntry).toHaveBeenCalledWith(fakeSession))
  })

  it('shows a safe error for malformed, expired, or reused callbacks', async () => {
    mockExchangeCallbackUrl.mockResolvedValue(err(makeError('auth')))
    const { getByTestId } = render(<AuthCallbackScreen />)

    await waitFor(() => expect(getByTestId('auth-callback-error')).toBeTruthy())
  })

  it('does not spin forever when no callback URL exists', async () => {
    mockUseURL.mockReturnValue(null)
    const { getByTestId } = render(<AuthCallbackScreen />)

    await waitFor(() => expect(getByTestId('auth-callback-error')).toBeTruthy())
    expect(mockExchangeCallbackUrl).not.toHaveBeenCalled()
  })
})
