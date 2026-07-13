import type { ReactNode } from 'react'
import { Redirect } from 'expo-router'
import { useRepositoriesIfAvailable } from '../hooks/use-repositories'

/**
 * Structural gate for routes that depend on a repository family being
 * mounted (the tab and obligation screens call useRepositories
 * unconditionally). If the provider is not mounted — e.g. a navigation frame
 * lands on tabs before OnboardingGuard's redirect completes, or persisted
 * state is inconsistent, or the active mode's boot is still pending —
 * declaratively redirect instead of letting the screen mount and throw.
 */
export function RequireRepositories({ children }: { children: ReactNode }) {
  const repos = useRepositoriesIfAvailable()
  if (repos === null) {
    return <Redirect href="/onboarding/welcome" />
  }
  return <>{children}</>
}
