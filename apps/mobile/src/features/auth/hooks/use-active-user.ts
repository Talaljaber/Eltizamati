import { useEffect, useState } from 'react'
import { DEMO_IDS } from '@eltizamati/demo-data'
import { type AppError, type Id } from '@eltizamati/domain'
import { getDataMode } from '@/features/demo/stores/demo-mode-store'
import { useAuthServiceLazy } from './use-auth-service'

export type ActiveUserState =
  | { readonly status: 'loading'; readonly userId: null }
  | { readonly status: 'demo'; readonly userId: Id<'user'> }
  | { readonly status: 'authenticated'; readonly userId: Id<'user'> }
  | { readonly status: 'signedOut'; readonly userId: null }
  | { readonly status: 'error'; readonly userId: null; readonly error: AppError }

export function useActiveUserState(): ActiveUserState {
  const getAuthService = useAuthServiceLazy()
  const [state, setState] = useState<ActiveUserState>({ status: 'loading', userId: null })

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    async function determineUser() {
      const mode = await getDataMode()
      if (cancelled) return
      if (mode === 'demo') {
        setState({ status: 'demo', userId: DEMO_IDS.userId })
        return
      }
      if (mode !== 'personal') {
        setState({ status: 'signedOut', userId: null })
        return
      }

      const authServiceResult = getAuthService()
      if (!authServiceResult.ok) {
        setState({ status: 'error', userId: null, error: authServiceResult.error })
        return
      }
      const service = authServiceResult.value
      const sessionResult = await service.currentSession()
      if (cancelled) return
      if (!sessionResult.ok) {
        setState({ status: 'error', userId: null, error: sessionResult.error })
        return
      }
      setState(
        sessionResult.value === undefined
          ? { status: 'signedOut', userId: null }
          : {
              status: 'authenticated',
              userId: sessionResult.value.user.id as Id<'user'>,
            },
      )

      const stop = service.onAuthStateChange((_event, session) => {
        if (cancelled) return
        setState(
          session?.user.id === undefined
            ? { status: 'signedOut', userId: null }
            : { status: 'authenticated', userId: session.user.id as Id<'user'> },
        )
      })
      if (cancelled) stop()
      else unsubscribe = stop
    }

    void determineUser()
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [getAuthService])

  return state
}

export function useActiveUser(): Id<'user'> | null {
  return useActiveUserState().userId
}
