import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { brandId, err, makeError, ok } from '@eltizamati/domain'
import ConnectBankDoneScreen from '../done'
import * as repositoriesModule from '@/features/repositories/hooks/use-repositories'
import * as activeUserModule from '@/features/auth/hooks/use-active-user'
import {
  __resetConnectBankFlowForTest,
  getConnectBankFlow,
  selectBank,
} from '@/features/connect-bank/connect-bank-flow-store'

const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: mockReplace }),
}))

const userId = brandId<'user'>('mock-user')
const markBankConnectComplete = jest.fn()

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  })
  jest.spyOn(repositoriesModule, 'useRepositories').mockReturnValue({
    userProfileRepository: { markBankConnectComplete },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  jest.spyOn(activeUserModule, 'useActiveUser').mockReturnValue(userId)
  return render(
    <QueryClientProvider client={client}>
      <ConnectBankDoneScreen />
    </QueryClientProvider>,
  )
}

describe('ConnectBankDoneScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetConnectBankFlowForTest()
  })

  it('"Yes" resets the flow and restarts at bank selection', () => {
    selectBank('arab-bank')
    const view = renderScreen()
    fireEvent.press(view.getByTestId('connect-bank-add-another'))
    expect(getConnectBankFlow().bankId).toBeUndefined()
    expect(mockReplace).toHaveBeenCalledWith('/connect-bank')
  })

  it('"No" marks the step complete and proceeds into the app', async () => {
    markBankConnectComplete.mockResolvedValue(ok({}))
    const view = renderScreen()
    fireEvent.press(view.getByTestId('connect-bank-finish'))
    await waitFor(() => expect(markBankConnectComplete).toHaveBeenCalledWith(userId, 'v1'))
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/'))
  })

  it('a failed completion shows an inline error and does not proceed into the app', async () => {
    markBankConnectComplete.mockResolvedValue(err(makeError('storage')))
    const view = renderScreen()
    fireEvent.press(view.getByTestId('connect-bank-finish'))
    await waitFor(() => expect(view.getByTestId('connect-bank-finish-error')).toBeTruthy())
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/')
  })
})
