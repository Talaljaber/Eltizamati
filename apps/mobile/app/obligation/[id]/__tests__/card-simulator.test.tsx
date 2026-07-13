import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import CardSimulatorScreen from '../card-simulator'
import { useCardPayoffSimulator } from '@/features/card-simulator/hooks/use-card-payoff-simulator'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'card-1' }),
}))

jest.mock('@/features/card-simulator/hooks/use-card-payoff-simulator', () => ({
  useCardPayoffSimulator: jest.fn(),
}))

const mockUseSimulator = useCardPayoffSimulator as jest.Mock

describe('CardSimulatorScreen', () => {
  it('renders input validation and invokes the calculation action', () => {
    const calculate = jest.fn()
    const setPaymentAmount = jest.fn()
    mockUseSimulator.mockReturnValue({
      obligation: { kind: 'creditCard', currency: 'JOD' },
      loading: false,
      loadError: false,
      paymentAmount: '0',
      setPaymentAmount,
      status: 'invalid',
      calculate,
    })

    const { getByText, getByDisplayValue } = render(<CardSimulatorScreen />)
    expect(getByText('cardSimulator.invalidPayment')).toBeTruthy()
    fireEvent.changeText(getByDisplayValue('0'), '125')
    expect(setPaymentAmount).toHaveBeenCalledWith('125')
    fireEvent.press(getByText('cardSimulator.calculate'))
    expect(calculate).toHaveBeenCalledTimes(1)
  })

  it('renders missing-data refusal instead of presenting a result', () => {
    mockUseSimulator.mockReturnValue({
      obligation: { kind: 'creditCard', currency: 'JOD' },
      loading: false,
      loadError: false,
      paymentAmount: '100',
      setPaymentAmount: jest.fn(),
      status: 'refused',
      calculate: jest.fn(),
    })
    const { getByText } = render(<CardSimulatorScreen />)
    expect(getByText('cardSimulator.missingData')).toBeTruthy()
  })
})
