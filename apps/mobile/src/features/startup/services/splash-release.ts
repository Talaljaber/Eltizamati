import * as SplashScreen from 'expo-splash-screen'
import { isExpoGo } from '@/core/config/runtime-environment'

// The native splash is a single global resource that is hidden exactly once.
// Concurrent callers (the startup flow, its error-recovery path, a re-run
// after a segment change) must not each invoke hideAsync() — a retained
// in-flight promise makes every concurrent request await the same hide.
let released = false
let inFlight: Promise<void> | undefined

/**
 * Hides the native splash, deduplicating concurrent requests. Concurrent
 * callers await one hideAsync(); success latches `released` so later calls
 * no-op; failure clears the in-flight promise so a later attempt can retry.
 * No-ops in Expo Go, which never registers a native splash for this API.
 */
export async function releaseNativeSplash(): Promise<void> {
  if (released || isExpoGo) return
  if (inFlight !== undefined) return inFlight
  const attempt = (async () => {
    await SplashScreen.hideAsync()
    released = true
  })()
  inFlight = attempt
  try {
    await attempt
  } finally {
    // Only clear if this attempt is still the current one; on success `released`
    // now short-circuits, on failure the cleared slot permits a fresh retry.
    if (inFlight === attempt) inFlight = undefined
  }
}

/** Test-only: resets the module-global latch between cases. */
export function __resetSplashReleaseForTest(): void {
  released = false
  inFlight = undefined
}
