import { useState, useEffect } from 'react'
import { DEMO_IDS } from '@eltizamati/demo-data'
import { getDataMode } from '@/features/demo/stores/demo-mode-store'
import { useAuthServiceLazy } from './use-auth-service'
import type { Id } from '@eltizamati/domain'

export function useActiveUser(): Id<'user'> | null {
  // Lazy on purpose: this hook is called by every core screen, demo mode
  // included. `useAuthServiceLazy()` itself never constructs the real
  // Supabase client — only calling the returned getter does, so the
  // `mode === 'personal'` branch below is what actually gates that
  // construction (and the network-touching GoTrueClient init it implies).
  const getAuthService = useAuthServiceLazy()
  const [activeUser, setActiveUser] = useState<Id<'user'> | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    async function determineUser() {
      const mode = await getDataMode()
      if (mode === 'demo') {
        setActiveUser(DEMO_IDS.userId)
      } else if (mode === 'personal') {
        const authServiceResult = getAuthService()
        if (!authServiceResult.ok) return
        const service = authServiceResult.value

        // Initial fetch
        const sessionResult = await service.currentSession()
        if (sessionResult.ok && sessionResult.value) {
          setActiveUser(sessionResult.value.user.id as Id<'user'>)
        } else {
          setActiveUser(null)
        }

        // Subscribe to changes
        unsubscribe = service.onAuthStateChange((session) => {
          setActiveUser(session?.user.id !== undefined ? (session.user.id as Id<'user'>) : null)
        })
      } else {
        setActiveUser(null)
      }
    }

    void determineUser()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [getAuthService])

  return activeUser
}
