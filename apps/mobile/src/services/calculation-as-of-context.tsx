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
}

const fallbackPersonalAsOf = systemLocalDateClock.today()
const CalculationAsOfContext = createContext<CalculationAsOfContextValue>({
  personalAsOf: fallbackPersonalAsOf,
  refresh: () => undefined,
})

export function CalculationAsOfProvider({
  children,
  clock = systemLocalDateClock,
}: {
  readonly children: ReactNode
  readonly clock?: LocalDateClock
}) {
  const [personalAsOf, setPersonalAsOf] = useState<LocalDate>(() => clock.today())
  const refresh = useCallback(() => setPersonalAsOf(clock.today()), [clock])
  const value = useMemo(() => ({ personalAsOf, refresh }), [personalAsOf, refresh])

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
