export interface LocalUserBoundaryCleanupDependencies {
  readonly cancelQueries: () => Promise<void>
  readonly clearQueryCache: () => void
  readonly resetRuntime: () => void
  readonly clearTrustState: () => Promise<void>
  readonly clearLocalConsent: () => Promise<void>
  readonly cancelReminder: () => Promise<void>
  readonly clearNotificationResponse: () => Promise<void>
}

export interface LocalUserBoundaryCleanupResult {
  readonly warnings: readonly string[]
}

/**
 * Removes all device/runtime state belonging to the prior authenticated user.
 * It intentionally has no server-auth operation, so a Supabase SIGNED_OUT
 * callback can use it without recursively signing out again.
 */
export async function runLocalUserBoundaryCleanup(
  dependencies: LocalUserBoundaryCleanupDependencies,
): Promise<LocalUserBoundaryCleanupResult> {
  const tasks: readonly (readonly [string, () => Promise<void> | void])[] = [
    ['queries', dependencies.cancelQueries],
    ['trust_state', dependencies.clearTrustState],
    ['local_consent', dependencies.clearLocalConsent],
    ['reminder', dependencies.cancelReminder],
    ['notification_response', dependencies.clearNotificationResponse],
    ['runtime', dependencies.resetRuntime],
  ]
  const results = await Promise.allSettled(tasks.map(([, task]) => task()))
  // The cache is the non-negotiable final guard even when other local cleanup
  // work failed. It is synchronous in TanStack Query.
  dependencies.clearQueryCache()
  return {
    warnings: results.flatMap((result, index) =>
      result.status === 'rejected' ? [tasks[index]?.[0] ?? 'unknown'] : [],
    ),
  }
}
