import type { ReactNode } from 'react'
import { Redirect } from 'expo-router'
import { useDemoRepositoriesIfAvailable } from '../hooks/use-demo-repositories'

/**
 * Structural gate for demo-only routes (Phase 5 prototype: the tab and
 * obligation screens call useDemoRepositories unconditionally). If the
 * provider is not mounted — e.g. a navigation frame lands on tabs before
 * OnboardingGuard's redirect completes, or persisted state is inconsistent —
 * declaratively redirect instead of letting the screen mount and throw.
 * Phase 7/8 replaces this when personal-mode data wiring reaches these
 * screens.
 */
export function RequireDemoRepositories({ children }: { children: ReactNode }) {
  const repos = useDemoRepositoriesIfAvailable()
  if (repos === null) {
    return <Redirect href="/onboarding/language" />
  }
  return <>{children}</>
}
