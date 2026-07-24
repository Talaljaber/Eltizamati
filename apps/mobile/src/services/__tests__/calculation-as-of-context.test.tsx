import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { toLocalDate } from '@eltizamati/domain'
import {
  CalculationAsOfProvider,
  usePersonalCalculationAsOf,
  useRefreshPersonalCalculationAsOf,
  useCalculationAsOfOverride,
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

  it('round-trips the fast-forward override: apply sets it, clear reverts to undefined (loan-detail "Apply rate now" / "Reset to today")', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CalculationAsOfProvider>{children}</CalculationAsOfProvider>
    )

    const { result } = renderHook(() => useCalculationAsOfOverride(), { wrapper })

    expect(result.current.override).toBeUndefined()

    act(() => result.current.applyAsOf(toLocalDate('2027-01-01')))
    expect(result.current.override).toBe('2027-01-01')

    act(() => result.current.clearAsOf())
    expect(result.current.override).toBeUndefined()
  })
})
