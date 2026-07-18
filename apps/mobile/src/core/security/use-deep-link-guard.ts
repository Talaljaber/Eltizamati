import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { isAllowedDeepLinkPath } from './deep-link-allowlist'
import { logger } from '@/core/logging/logger'

/**
 * Best-effort corrective guard against an external deep link (a link Expo
 * Router auto-routes to before this hook runs, since Expo Router's own
 * Linking integration isn't preemptable from userland) landing on a path
 * outside the allow-list. When that happens, redirects to the tab root
 * immediately rather than leaving the disallowed screen mounted.
 *
 * This is defense in depth, not the primary safety net — the actual
 * "no unsafe state from a malformed link" guarantee comes from each
 * destination screen's own not-found/refused handling (e.g.
 * obligation/[id].tsx re-resolves the id and shows a safe not-found state).
 */
export function useDeepLinkGuard(): void {
  const router = useRouter()
  const url = Linking.useURL()

  useEffect(() => {
    if (url === null || url === undefined) return
    const path = Linking.parse(url).path ?? ''
    if (isAllowedDeepLinkPath(path)) return
    logger.warn({ stage: 'deepLinkGuard:rejected' })
    router.replace('/(tabs)')
  }, [url, router])
}
