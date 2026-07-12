import { useState, useEffect } from 'react'
import { DEMO_IDS } from '@eltizamati/demo-data'
import { getDataMode } from '@/features/demo/stores/demo-mode-store'
import { useAuthService } from './use-auth-service'
import type { Id } from '@eltizamati/domain'

export function useActiveUser(): Id<'user'> | null {
  const authServiceResult = useAuthService()
  const authService = authServiceResult.ok ? authServiceResult.value : null
  const [activeUser, setActiveUser] = useState<Id<'user'> | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    async function determineUser() {
      const mode = await getDataMode()
      if (mode === 'demo') {
        setActiveUser(DEMO_IDS.userId)
      } else if (mode === 'personal') {
        if (!authService) return
        const service = authService

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
  }, [authService])

  return activeUser
}
