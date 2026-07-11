import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createDemoRepositories, type DemoRepositories } from './services/repositories/demo'
import { ImportService } from './services/import-service'
import { DemoSeedProvider } from './services/demo-seed-provider'
import { DemoRepositoriesProvider } from './features/demo/hooks/use-demo-repositories'
import { getDataMode } from './features/demo/stores/demo-mode-store'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: ReactNode }) {
  const [demoRepos, setDemoRepos] = useState<DemoRepositories | null>(null)

  useEffect(() => {
    async function boot() {
      const mode = await getDataMode()
      if (mode === 'demo') {
        const repos = createDemoRepositories()
        const provider = new DemoSeedProvider()
        const seed = provider.provide()
        const importer = new ImportService()

        // Populate the in-memory repos
        await importer.importDemoSeed(seed, repos)
        setDemoRepos(repos)
      } else {
        // Personal mode (Phase 4 integration pending)
        // For now, if no mode is selected or personal mode is active,
        // we can either wait or just render without repos.
        // We'll leave demoRepos as null in this case.
      }
    }
    void boot()
  }, [])

  // If in demo mode but not yet initialized, show loader
  // Note: we can't synchronously know data mode here without an async check.
  // The OnboardingGuard handles redirecting to onboarding if mode isn't set.

  return (
    <QueryClientProvider client={queryClient}>
      {demoRepos ? (
        <DemoRepositoriesProvider repositories={demoRepos}>{children}</DemoRepositoriesProvider>
      ) : (
        children
      )}
    </QueryClientProvider>
  )
}
