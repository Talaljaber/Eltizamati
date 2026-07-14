import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { getDataMode } from '@/features/demo/stores/demo-mode-store'
import { useRefreshPersonalCalculationAsOf } from '@/services/calculation-as-of-context'

const MIN_FOREGROUND_INVALIDATION_INTERVAL_MS = 15_000

/** App-wide foreground owner. Supabase token refresh itself is client-owned. */
export function AppLifecycleCoordinator() {
  const queryClient = useQueryClient()
  const refreshCalculationDate = useRefreshPersonalCalculationAsOf()
  const previousState = useRef<AppStateStatus>(AppState.currentState)
  const lastInvalidationAt = useRef(0)

  useEffect(() => {
    let active = true
    const subscription = AppState.addEventListener('change', (nextState) => {
      const returnedToForeground = previousState.current !== 'active' && nextState === 'active'
      previousState.current = nextState
      if (!returnedToForeground) return

      refreshCalculationDate()
      void getDataMode().then((mode) => {
        if (!active || mode !== 'personal') return
        const now = Date.now()
        if (now - lastInvalidationAt.current < MIN_FOREGROUND_INVALIDATION_INTERVAL_MS) return
        lastInvalidationAt.current = now
        void queryClient.invalidateQueries({ refetchType: 'active' })
      })
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [queryClient, refreshCalculationDate])

  return null
}
