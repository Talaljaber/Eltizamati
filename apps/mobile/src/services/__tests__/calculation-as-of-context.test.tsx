import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { toLocalDate } from '@eltizamati/domain'
import {
  CalculationAsOfProvider,
  usePersonalCalculationAsOf,
  useRefreshPersonalCalculationAsOf,
  type LocalDateClock,
} from '../calculation-as-of-context'

describe('CalculationAsOfProvider', () => {
  it('samples one date for all workflows and refreshes only through the shared boundary', () => {
    const today = jest
      .fn<ReturnType<LocalDateClock['today']>, []>()
      .mockReturnValueOnce(toLocalDate('2026-07-16'))
      .mockReturnValueOnce(toLocalDate('2026-07-17'))
    const clock: LocalDateClock = { today }
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CalculationAsOfProvider clock={clock}>{children}</CalculationAsOfProvider>
    )

    const { result } = renderHook(
      () => ({ asOf: usePersonalCalculationAsOf(), refresh: useRefreshPersonalCalculationAsOf() }),
      { wrapper },
    )

    expect(result.current.asOf).toBe('2026-07-16')
    expect(today).toHaveBeenCalledTimes(1)
    act(() => result.current.refresh())
    expect(result.current.asOf).toBe('2026-07-17')
    expect(today).toHaveBeenCalledTimes(2)
  })
})
