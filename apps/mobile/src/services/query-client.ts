/**
 * TanStack Query foundation (Phase 4, ADR-0004). One QueryClient per
 * composition root — never a module-level singleton, so tests and future
 * multi-instance scenarios (e.g. sign-out) get a clean cache.
 */
import { QueryClient } from '@tanstack/react-query'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
      mutations: {
        // Financial writes are never silently retried (ADR-0017 offline contract) —
        // callers surface failures through AppError, not automatic re-submission.
        retry: false,
      },
    },
  })
}
