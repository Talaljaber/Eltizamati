import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createDemoRepositories } from './services/repositories/demo'
import { createCompositionRoot, type RepositoryRegistry } from './services/composition-root'
import { ImportService } from './services/import-service'
import { DemoSeedProvider } from './services/demo-seed-provider'
import {
  RepositoriesProvider,
  type Repositories,
} from './features/repositories/hooks/use-repositories'
import { getDataMode } from './features/demo/stores/demo-mode-store'
import { AuthServiceProvider } from './features/auth/hooks/use-auth-service'
import { DomainInvariantError, type AppError } from '@eltizamati/domain'
import { ErrorState } from './core/design-system'
import { toErrorUiState } from './core/errors/error-ui-state'

const queryClient = new QueryClient()

/**
 * `AppProviders` mounts once, above the router — its initial mode check can't
 * see a mode chosen later in the same session (e.g. onboarding's mode
 * screen, or a successful sign-in/sign-up). Onboarding calls `bootDemoMode()`
 * from this context directly, right after persisting the choice, instead of
 * relying on a remount that expo-router navigation never triggers.
 */
const DemoBootContext = createContext<(() => Promise<void>) | null>(null)
const PersonalBootContext = createContext<(() => Promise<void>) | null>(null)

export function useDemoBoot(): () => Promise<void> {
  const boot = useContext(DemoBootContext)
  if (boot === null) {
    throw new DomainInvariantError('unexpected', 'useDemoBoot must be used within AppProviders')
  }
  return boot
}

/**
 * Mirrors `useDemoBoot`: auth screens call this right after a successful
 * sign-in/sign-up, before navigating to `/(tabs)/`, since `AppProviders`'
 * own mount effect already ran before the user authenticated and won't
 * re-run on navigation.
 */
export function usePersonalBoot(): () => Promise<void> {
  const boot = useContext(PersonalBootContext)
  if (boot === null) {
    throw new DomainInvariantError('unexpected', 'usePersonalBoot must be used within AppProviders')
  }
  return boot
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<Repositories | null>(null)
  // Distinguishes "nothing to wait for" (no mode chosen yet) from "a mode is
  // selected, still booting". Set inside the relevant `boot*Mode` function
  // itself — not by whichever caller happens to invoke it — so the render
  // gate below is correct regardless of who triggers the boot: this
  // component's own mount effect (cold start after onboarding/sign-in was
  // already completed) or onboarding/auth screens calling it directly before
  // navigating. Both call sites `await boot*Mode()` then immediately trigger
  // navigation; `setRepos` scheduling a re-render does not guarantee that
  // re-render (mounting `RepositoriesProvider`) commits before the
  // destination screen mounts and calls `useRepositories()` — without this
  // gate, either path can throw DomainInvariantError.
  const [pendingRepoBoot, setPendingRepoBoot] = useState(false)
  const [bootError, setBootError] = useState<AppError | null>(null)
  const bootedDemoRef = useRef(false)
  const bootedPersonalRef = useRef(false)

  const bootDemoMode = useCallback(async () => {
    if (bootedDemoRef.current) return
    bootedDemoRef.current = true
    setPendingRepoBoot(true)
    const demoRepos = createDemoRepositories()
    const provider = new DemoSeedProvider()
    const seed = provider.provide()
    const importer = new ImportService()
    await importer.importDemoSeed(seed, demoRepos)
    setRepos(demoRepos)
    setPendingRepoBoot(false)
  }, [])

  const bootPersonalMode = useCallback(async () => {
    if (bootedPersonalRef.current) return
    bootedPersonalRef.current = true
    setPendingRepoBoot(true)
    const result = createCompositionRoot('personal')
    if (!result.ok) {
      // Matches AuthServiceProvider's convention: surface a Result err
      // rather than throwing, so a bad/missing Supabase env renders a fatal
      // state instead of crashing the app.
      setBootError(result.error)
      setPendingRepoBoot(false)
      return
    }
    const repositories = result.value.repositories as RepositoryRegistry
    setRepos(repositories)
    setPendingRepoBoot(false)
  }, [])

  useEffect(() => {
    async function boot() {
      const mode = await getDataMode()
      if (mode === 'demo') {
        await bootDemoMode()
      } else if (mode === 'personal') {
        await bootPersonalMode()
      }
    }
    void boot()
  }, [bootDemoMode, bootPersonalMode])

  const stillBootingRepos = pendingRepoBoot && repos === null

  return (
    <QueryClientProvider client={queryClient}>
      <AuthServiceProvider>
        <DemoBootContext.Provider value={bootDemoMode}>
          <PersonalBootContext.Provider value={bootPersonalMode}>
            {bootError !== null ? (
              // Fatal boot failure (e.g. missing/invalid Supabase env in
              // personal mode) — nothing downstream can recover without
              // repositories, so render the honest fatal surface instead of
              // mounting a router that will crash on useRepositories().
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ErrorState state={toErrorUiState(bootError)} testID="app-boot-error" />
              </View>
            ) : stillBootingRepos ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : repos ? (
              <RepositoriesProvider repositories={repos}>{children}</RepositoriesProvider>
            ) : (
              children
            )}
          </PersonalBootContext.Provider>
        </DemoBootContext.Provider>
      </AuthServiceProvider>
    </QueryClientProvider>
  )
}
