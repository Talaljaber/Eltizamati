import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { localDateFromDate, type LocalDate } from '@eltizamati/domain'

export interface LocalDateClock {
  today(): LocalDate
}

export const systemLocalDateClock: LocalDateClock = {
  today: () => localDateFromDate(new Date()),
}

interface CalculationAsOfContextValue {
  readonly personalAsOf: LocalDate
  readonly refresh: () => void
  /**
   * Demo/testing time-travel: when set, this date overrides BOTH the personal `today` and the
   * demo `DEMO_DATE` in every calculation (see calculationAsOf). It lets a reviewer fast-forward
   * to when a just-published (future-dated) rate becomes effective, so the loan reflects it
   * immediately instead of waiting for the real date to arrive. Undefined = no override (normal).
   */
  readonly asOfOverride: LocalDate | undefined
  readonly applyAsOf: (date: LocalDate) => void
  readonly clearAsOf: () => void
}

const fallbackPersonalAsOf = systemLocalDateClock.today()
const CalculationAsOfContext = createContext<CalculationAsOfContextValue>({
  personalAsOf: fallbackPersonalAsOf,
  refresh: () => undefined,
  asOfOverride: undefined,
  applyAsOf: () => undefined,
  clearAsOf: () => undefined,
})

export function CalculationAsOfProvider({
  children,
  clock = systemLocalDateClock,
}: {
  readonly children: ReactNode
  readonly clock?: LocalDateClock
}) {
  const [personalAsOf, setPersonalAsOf] = useState<LocalDate>(() => clock.today())
  const [asOfOverride, setAsOfOverride] = useState<LocalDate | undefined>(undefined)
  const refresh = useCallback(() => setPersonalAsOf(clock.today()), [clock])
  const applyAsOf = useCallback((date: LocalDate) => setAsOfOverride(date), [])
  const clearAsOf = useCallback(() => setAsOfOverride(undefined), [])
  const value = useMemo(
    () => ({ personalAsOf, refresh, asOfOverride, applyAsOf, clearAsOf }),
    [personalAsOf, refresh, asOfOverride, applyAsOf, clearAsOf],
  )

  return <CalculationAsOfContext.Provider value={value}>{children}</CalculationAsOfContext.Provider>
}

/** One composition-root-owned personal date shared by every rendered workflow. */
export function usePersonalCalculationAsOf(): LocalDate {
  return useContext(CalculationAsOfContext).personalAsOf
}

/** Used by the foreground lifecycle coordinator to cross civil-date boundaries safely. */
export function useRefreshPersonalCalculationAsOf(): () => void {
  return useContext(CalculationAsOfContext).refresh
}

/**
 * Demo fast-forward control: the current override date (if any) plus setters to jump to a date
 * or reset to real time. Used by the loan detail's "Apply rate now" button.
 */
export function useCalculationAsOfOverride(): {
  readonly override: LocalDate | undefined
  readonly applyAsOf: (date: LocalDate) => void
  readonly clearAsOf: () => void
} {
  const { asOfOverride, applyAsOf, clearAsOf } = useContext(CalculationAsOfContext)
  return { override: asOfOverride, applyAsOf, clearAsOf }
}
