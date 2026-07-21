import React from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { brandId, err, makeError, ok } from '@eltizamati/domain'
import ConnectBankPickerScreen from '../index'
import * as repositoriesModule from '@/features/repositories/hooks/use-repositories'
import * as activeUserModule from '@/features/auth/hooks/use-active-user'
import { __resetConnectBankFlowForTest, getConnectBankFlow } from '@/features/connect-bank/connect-bank-flow-store'

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ConnectBankPickerScreen />
    </QueryClientProvider>,
  )
}

const mockReplace = jest.fn()
const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: mockReplace, push: mockPush, canGoBack: () => false }),
}))

// The real hook needs a mounted NavigationContainer, which these unit tests
// don't provide. This stand-in also exposes the latest focus callback so a
// test can re-invoke it to simulate the screen regaining focus after a
// back-navigation, which a plain mount-only effect could never exercise.
let mockLatestFocusCallback: (() => void) | undefined
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    mockLatestFocusCallback = cb
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [])
  },
}))

const userId = brandId<'user'>('mock-user')
const status = jest.fn()
const markBankConnectComplete = jest.fn()

function mockRepos() {
  jest.spyOn(repositoriesModule, 'useRepositories').mockReturnValue({
    consentRepository: { status },
    userProfileRepository: { markBankConnectComplete },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  jest.spyOn(activeUserModule, 'useActiveUser').mockReturnValue(userId)
}

describe('ConnectBankPickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetConnectBankFlowForTest()
  })

  it('shows the bank list and mock disclosure once provider consent is confirmed', async () => {
    mockRepos()
    status.mockResolvedValue(
      ok([{ docType: 'provider:mock-open-banking', version: 'v1' }]),
    )
    const { findByText, getByTestId, getByText } = renderScreen()
    await findByText('connectBank.pickerTitle')
    expect(getByTestId('connect-bank-pick-arab-bank')).toBeTruthy()
    expect(getByTestId('connect-bank-skip')).toBeTruthy()
    // Permanent mock disclosure — must be visible before any bank is picked.
    expect(getByText('connectBank.mockDisclosure')).toBeTruthy()
  })

  it('redirects to the shared consent screen with a return route when consent is missing', async () => {
    mockRepos()
    status.mockResolvedValue(ok([]))
    renderScreen()
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/connect-mock/consent',
        params: { return: '/connect-bank' },
      }),
    )
  })

  it('shows an error state (not the consent screen) when the consent check itself fails, with a working retry', async () => {
    mockRepos()
    status.mockResolvedValueOnce(err(makeError('storage')))
    status.mockResolvedValueOnce(ok([{ docType: 'provider:mock-open-banking', version: 'v1' }]))
    const { findByTestId, getByText, findByText } = renderScreen()
    await findByTestId('connect-bank-consent-error')
    expect(mockReplace).not.toHaveBeenCalled()

    fireEvent.press(getByText('common.retry'))
    await findByText('connectBank.pickerTitle')
    expect(status).toHaveBeenCalledTimes(2)
  })

  it('selecting a bank stores it in the flow and navigates to sign-in', async () => {
    mockRepos()
    status.mockResolvedValue(ok([{ docType: 'provider:mock-open-banking', version: 'v1' }]))
    const { findByTestId } = renderScreen()
    const bankButton = await findByTestId('connect-bank-pick-housing-bank')
    fireEvent.press(bankButton)
    expect(getConnectBankFlow().bankId).toBe('housing-bank')
    expect(mockPush).toHaveBeenCalledWith('/connect-bank/sign-in')
  })

  it('skip marks the step complete and proceeds into the app', async () => {
    mockRepos()
    status.mockResolvedValue(ok([{ docType: 'provider:mock-open-banking', version: 'v1' }]))
    markBankConnectComplete.mockResolvedValue(ok({}))
    const { findByTestId } = renderScreen()
    fireEvent.press(await findByTestId('connect-bank-skip'))
    await waitFor(() => expect(markBankConnectComplete).toHaveBeenCalledWith(userId, 'v1'))
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/'))
  })

  it('a failed skip shows an inline error and does not navigate into the app', async () => {
    mockRepos()
    status.mockResolvedValue(ok([{ docType: 'provider:mock-open-banking', version: 'v1' }]))
    markBankConnectComplete.mockResolvedValue(err(makeError('storage')))
    const { findByTestId } = renderScreen()
    fireEvent.press(await findByTestId('connect-bank-skip'))
    await findByTestId('connect-bank-skip-error')
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/')
  })

  it('regaining focus (e.g. pressing back from sign-in) releases the navigating guard, so the picker never gets stuck disabled', async () => {
    mockRepos()
    status.mockResolvedValue(ok([{ docType: 'provider:mock-open-banking', version: 'v1' }]))
    const { findByTestId } = renderScreen()
    const bankButton = await findByTestId('connect-bank-pick-arab-bank')

    fireEvent.press(bankButton)
    expect(bankButton.props.accessibilityState.disabled).toBe(true)

    act(() => {
      mockLatestFocusCallback?.()
    })
    expect(bankButton.props.accessibilityState.disabled).toBe(false)
  })
})
