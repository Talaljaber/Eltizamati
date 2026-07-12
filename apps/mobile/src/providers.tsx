import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createDemoRepositories, type DemoRepositories } from './services/repositories/demo'
import { ImportService } from './services/import-service'
import { DemoSeedProvider } from './services/demo-seed-provider'
import { DemoRepositoriesProvider } from './features/demo/hooks/use-demo-repositories'
import { getDataMode } from './features/demo/stores/demo-mode-store'
import { DomainInvariantError } from '@eltizamati/domain'

const queryClient = new QueryClient()

/**
 * `AppProviders` mounts once, above the router — its initial mode check can't
 * see a mode chosen later in the same session (e.g. onboarding's mode
 * screen). Onboarding calls `bootDemoMode()` from this context directly,
 * right after persisting the choice, instead of relying on a remount that
 * expo-router navigation never triggers.
 */
const DemoBootContext = createContext<(() => Promise<void>) | null>(null)

export function useDemoBoot(): () => Promise<void> {
  const boot = useContext(DemoBootContext)
  if (boot === null) {
    throw new DomainInvariantError('unexpected', 'useDemoBoot must be used within AppProviders')
  }
  return boot
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [demoRepos, setDemoRepos] = useState<DemoRepositories | null>(null)
  const bootedRef = useRef(false)

  const bootDemoMode = useCallback(async () => {
    if (bootedRef.current) return
    bootedRef.current = true
    const repos = createDemoRepositories()
    const provider = new DemoSeedProvider()
    const seed = provider.provide()
    const importer = new ImportService()
    await importer.importDemoSeed(seed, repos)
    setDemoRepos(repos)
  }, [])

  useEffect(() => {
    async function boot() {
      const mode = await getDataMode()
      if (mode === 'demo') {
        await bootDemoMode()
      }
      // Personal mode (Phase 4 integration pending): leave demoRepos null.
    }
    void boot()
  }, [bootDemoMode])

  return (
    <QueryClientProvider client={queryClient}>
      <DemoBootContext.Provider value={bootDemoMode}>
        {demoRepos ? (
          <DemoRepositoriesProvider repositories={demoRepos}>{children}</DemoRepositoriesProvider>
        ) : (
          children
        )}
      </DemoBootContext.Provider>
    </QueryClientProvider>
  )
}
