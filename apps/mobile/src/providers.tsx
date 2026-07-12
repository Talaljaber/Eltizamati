import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createDemoRepositories, type DemoRepositories } from './services/repositories/demo'
import { ImportService } from './services/import-service'
import { DemoSeedProvider } from './services/demo-seed-provider'
import { DemoRepositoriesProvider } from './features/demo/hooks/use-demo-repositories'
import { getDataMode } from './features/demo/stores/demo-mode-store'
import { AuthServiceProvider } from './features/auth/hooks/use-auth-service'
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
  // Distinguishes "nothing to wait for" (personal mode, or no mode chosen
  // yet) from "demo mode selected, still booting". Set inside `bootDemoMode`
  // itself — not by whichever caller happens to invoke it — so the render
  // gate below is correct regardless of who triggers the boot: this
  // component's own mount effect (cold start after onboarding was already
  // completed) or onboarding's mode screen calling it directly before
  // navigating. Both call sites `await bootDemoMode()` then immediately
  // trigger navigation; `setDemoRepos` scheduling a re-render does not
  // guarantee that re-render (mounting `DemoRepositoriesProvider`) commits
  // before the destination screen mounts and calls `useDemoRepositories()` —
  // without this gate, either path can throw DomainInvariantError.
  const [pendingDemoBoot, setPendingDemoBoot] = useState(false)
  const bootedRef = useRef(false)

  const bootDemoMode = useCallback(async () => {
    if (bootedRef.current) return
    bootedRef.current = true
    setPendingDemoBoot(true)
    const repos = createDemoRepositories()
    const provider = new DemoSeedProvider()
    const seed = provider.provide()
    const importer = new ImportService()
    await importer.importDemoSeed(seed, repos)
    setDemoRepos(repos)
    setPendingDemoBoot(false)
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

  const stillBootingDemo = pendingDemoBoot && demoRepos === null

  return (
    <QueryClientProvider client={queryClient}>
      <AuthServiceProvider>
        <DemoBootContext.Provider value={bootDemoMode}>
          {stillBootingDemo ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : demoRepos ? (
            <DemoRepositoriesProvider repositories={demoRepos}>{children}</DemoRepositoriesProvider>
          ) : (
            children
          )}
        </DemoBootContext.Provider>
      </AuthServiceProvider>
    </QueryClientProvider>
  )
}
