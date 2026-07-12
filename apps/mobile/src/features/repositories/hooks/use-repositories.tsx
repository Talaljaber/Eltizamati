/**
 * Unified repositories context — Phase 6 (ADR-0009).
 *
 * Provides the live repository instances to the React tree, regardless of
 * which family is active (demo in-memory repositories or Supabase-backed
 * personal-mode repositories). Both families implement the identical
 * `packages/domain` repository ports, so screens depending on this context
 * are mode-agnostic. The context is set up once in `AppProviders` once the
 * active mode's repositories have finished booting.
 *
 * Usage:
 *   const repos = useRepositories()
 *   const { data } = useQuery({ queryKey: ['obligations'], queryFn: () => repos.obligationRepository.list(userId) })
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { DemoRepositories } from '@/services/repositories/demo'
import type { RepositoryRegistry } from '@/services/composition-root'
import { DomainInvariantError } from '@eltizamati/domain'

export type Repositories = DemoRepositories | RepositoryRegistry

const RepositoriesContext = createContext<Repositories | null>(null)

export function RepositoriesProvider({
  repositories,
  children,
}: {
  repositories: Repositories
  children: ReactNode
}) {
  return (
    <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>
  )
}

export function useRepositories(): Repositories {
  const repos = useContext(RepositoriesContext)
  if (repos === null) {
    throw new DomainInvariantError(
      'unexpected',
      'useRepositories must be used within RepositoriesProvider',
    )
  }
  return repos
}

/**
 * Nullable variant for structural guards: returns null when no provider is
 * mounted instead of throwing. Screens should not use this directly —
 * RequireRepositories consumes it to make repository-dependent routes
 * unreachable without the provider.
 */
export function useRepositoriesIfAvailable(): Repositories | null {
  return useContext(RepositoriesContext)
}
