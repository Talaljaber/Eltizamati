import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'
import ConnectBankSignInScreen from '../sign-in'
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

describe('ConnectBankSignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetConnectBankFlowForTest()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('redirects to the bank picker when no bank has been selected', () => {
    render(<ConnectBankSignInScreen />)
    expect(mockReplace).toHaveBeenCalledWith('/connect-bank')
  })

  it('masks the password field (secure entry) and labels Face ID as simulated', () => {
    selectBank('arab-bank')
    const view = render(<ConnectBankSignInScreen />)
    expect(view.getByTestId('connect-bank-password').props.secureTextEntry).toBe(true)
    expect(view.getByTestId('connect-bank-account-number').props.secureTextEntry).toBeFalsy()
    expect(view.getByText('connectBank.useFaceId')).toBeTruthy()
  })

  it('any credentials succeed: after the simulated delay it marks the bank signed in and navigates to select', () => {
    selectBank('arab-bank')
    const view = render(<ConnectBankSignInScreen />)
    fireEvent.changeText(view.getByTestId('connect-bank-account-number'), 'whatever')
    fireEvent.changeText(view.getByTestId('connect-bank-password'), 'whatever')
    fireEvent.press(view.getByTestId('connect-bank-sign-in-submit'))

    expect(getConnectBankFlow().signedIn).toBe(false)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(getConnectBankFlow().signedIn).toBe(true)
    expect(mockReplace).toHaveBeenCalledWith('/connect-bank/select')
  })

  it('the simulated Face ID path also succeeds and navigates to select', () => {
    selectBank('housing-bank')
    const view = render(<ConnectBankSignInScreen />)
    fireEvent.press(view.getByTestId('connect-bank-face-id'))
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(getConnectBankFlow().signedIn).toBe(true)
    expect(mockReplace).toHaveBeenCalledWith('/connect-bank/select')
  })

  it('cancels the pending sign-in timer on unmount, so it never fires after the user has left', () => {
    selectBank('arab-bank')
    const view = render(<ConnectBankSignInScreen />)
    fireEvent.press(view.getByTestId('connect-bank-sign-in-submit'))
    view.unmount()
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(getConnectBankFlow().signedIn).toBe(false)
    expect(mockReplace).not.toHaveBeenCalledWith('/connect-bank/select')
  })
})
