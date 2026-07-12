/**
 * Demo repositories context — Phase 5.
 *
 * Provides the live demo repository instances to the React tree.
 * The context is set up once in the root layout when dataMode === 'demo'.
 *
 * Usage:
 *   const repos = useDemoRepositories()
 *   const { data } = useQuery({ queryKey: ['obligations'], queryFn: () => repos.obligationRepository.list(userId) })
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { DemoRepositories } from '@/services/repositories/demo'
import { DomainInvariantError } from '@eltizamati/domain'

const DemoRepositoriesContext = createContext<DemoRepositories | null>(null)

export function DemoRepositoriesProvider({
  repositories,
  children,
}: {
  repositories: DemoRepositories
  children: ReactNode
}) {
  return (
    <DemoRepositoriesContext.Provider value={repositories}>
      {children}
    </DemoRepositoriesContext.Provider>
  )
}

export function useDemoRepositories(): DemoRepositories {
  const repos = useContext(DemoRepositoriesContext)
  if (repos === null) {
    throw new DomainInvariantError(
      'unexpected',
      'useDemoRepositories must be used within DemoRepositoriesProvider',
    )
  }
  return repos
}

/**
 * Nullable variant for structural guards: returns null when no provider is
 * mounted instead of throwing. Screens should not use this directly —
 * RequireDemoRepositories consumes it to make demo-only routes unreachable
 * without the provider.
 */
export function useDemoRepositoriesIfAvailable(): DemoRepositories | null {
  return useContext(DemoRepositoriesContext)
}
