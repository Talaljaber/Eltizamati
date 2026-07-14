import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { DomainInvariantError } from '@eltizamati/domain'
import { createDemoRepositories } from './services/repositories/demo'
import type { RepositoryRegistry } from './services/composition-root'
import { ImportService } from './services/import-service'
import { DemoSeedProvider } from './services/demo-seed-provider'
import {
  RepositoriesProvider,
  type Repositories,
} from './features/repositories/hooks/use-repositories'
import {
  AuthServiceProvider,
  usePersonalRepositoriesLazy,
} from './features/auth/hooks/use-auth-service'
import { CalculationAsOfProvider } from './services/calculation-as-of-context'
import { createQueryClient } from './services/query-client'
import { AppLifecycleCoordinator } from './features/lifecycle/components/AppLifecycleCoordinator'
import { AuthBoundaryCoordinator } from './features/auth/components/AuthBoundaryCoordinator'

const DemoBootContext = createContext<(() => Promise<void>) | null>(null)
const PersonalBootContext = createContext<(() => Promise<void>) | null>(null)
const AppRuntimeResetContext = createContext<(() => void) | null>(null)

export function useDemoBoot(): () => Promise<void> {
  const boot = useContext(DemoBootContext)
  if (boot === null) {
    throw new DomainInvariantError('unexpected', 'useDemoBoot must be used within AppProviders')
  }
  return boot
}

export function usePersonalBoot(): () => Promise<void> {
  const boot = useContext(PersonalBootContext)
  if (boot === null) {
    throw new DomainInvariantError('unexpected', 'usePersonalBoot must be used within AppProviders')
  }
  return boot
}

export function useResetAppRuntime(): () => void {
  const reset = useContext(AppRuntimeResetContext)
  if (reset === null) {
    throw new DomainInvariantError(
      'unexpected',
      'useResetAppRuntime must be used within AppProviders',
    )
  }
  return reset
}

export function useResetAppRuntimeIfAvailable(): () => void {
  const reset = useContext(AppRuntimeResetContext)
  return reset ?? NOOP_RESET
}

const NOOP_RESET = () => undefined

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <CalculationAsOfProvider>
        <AppLifecycleCoordinator />
        <AuthServiceProvider>
          <AppRuntimeProviders>{children}</AppRuntimeProviders>
        </AuthServiceProvider>
      </CalculationAsOfProvider>
    </QueryClientProvider>
  )
}

function AppRuntimeProviders({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<Repositories | null>(null)
  const bootedDemoRef = useRef(false)
  const bootedPersonalRef = useRef(false)
  const demoBootPromiseRef = useRef<Promise<void> | undefined>(undefined)
  const personalBootPromiseRef = useRef<Promise<void> | undefined>(undefined)
  const getPersonalRepositories = usePersonalRepositoriesLazy()

  // Boot must not resolve until React has committed RepositoriesProvider with
  // the new repos, otherwise entry-completion navigates and RequireRepositories
  // still observes `repos === null`, bouncing the user back to sign-in. Boot
  // registers a resolver here, then this effect fires it once `repos` is
  // rendered and available to descendants — a minimal commit acknowledgement,
  // not a general coordinator.
  const commitWaitersRef = useRef<(() => void)[]>([])
  useEffect(() => {
    if (repos === null) return
    const waiters = commitWaitersRef.current
    commitWaitersRef.current = []
    for (const resolve of waiters) resolve()
  }, [repos])

  const awaitReposCommitted = useCallback(
    () => new Promise<void>((resolve) => commitWaitersRef.current.push(resolve)),
    [],
  )

  const resetAppRuntime = useCallback(() => {
    setRepos(null)
    bootedDemoRef.current = false
    bootedPersonalRef.current = false
  }, [])

  const bootDemoMode = useCallback(async () => {
    if (bootedDemoRef.current) return
    if (demoBootPromiseRef.current !== undefined) return demoBootPromiseRef.current
    demoBootPromiseRef.current = (async () => {
      try {
        const demoRepos = createDemoRepositories()
        const seed = new DemoSeedProvider().provide()
        const result = await new ImportService().importDemoSeed(seed, demoRepos)
        if (!result.ok) throw result.error
        const committed = awaitReposCommitted()
        setRepos(demoRepos)
        await committed
        bootedDemoRef.current = true
      } finally {
        demoBootPromiseRef.current = undefined
      }
    })()
    return demoBootPromiseRef.current
  }, [awaitReposCommitted])

  const bootPersonalMode = useCallback(async () => {
    if (bootedPersonalRef.current) return
    if (personalBootPromiseRef.current !== undefined) return personalBootPromiseRef.current
    personalBootPromiseRef.current = (async () => {
      try {
        const result = getPersonalRepositories()
        if (!result.ok) throw result.error
        const committed = awaitReposCommitted()
        setRepos(result.value as RepositoryRegistry)
        await committed
        bootedPersonalRef.current = true
      } finally {
        personalBootPromiseRef.current = undefined
      }
    })()
    return personalBootPromiseRef.current
  }, [awaitReposCommitted, getPersonalRepositories])

  return (
    <DemoBootContext.Provider value={bootDemoMode}>
      <PersonalBootContext.Provider value={bootPersonalMode}>
        <AppRuntimeResetContext.Provider value={resetAppRuntime}>
          <AuthBoundaryCoordinator />
          {repos ? (
            <RepositoriesProvider repositories={repos}>{children}</RepositoriesProvider>
          ) : (
            children
          )}
        </AppRuntimeResetContext.Provider>
      </PersonalBootContext.Provider>
    </DemoBootContext.Provider>
  )
}
