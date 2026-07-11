/**
 * Centralized TanStack Query keys for the auth feature (system-architecture.md
 * §4 — no ad-hoc string keys). Add new key factories here as auth screens
 * (sign-in/up/reset) land in a later Phase 4 slice.
 */
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  profile: (userId: string) => [...authKeys.all, 'profile', userId] as const,
} as const
