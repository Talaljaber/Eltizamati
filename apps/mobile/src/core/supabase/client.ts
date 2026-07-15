/**
 * Supabase client — the only place `createClient` is called (Phase 4,
 * ADR-0017). Never constructed for demo mode; demo mode never imports
 * this module (composition-root only calls it when `dataMode === 'personal'`).
 */
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import { ok, type Result, type AppError } from '@eltizamati/domain'
import type { Database } from './database.types'
import { loadSupabaseEnv } from '../config/env'
import { secureStoreAdapter } from './secure-store-adapter'

let cachedClient: SupabaseClient<Database> | undefined
let authLifecycleSubscription: ReturnType<typeof AppState.addEventListener> | undefined

function runAuthLifecycleOperation(action: () => Promise<void>): void {
  // AppState callbacks and React cleanup are synchronous boundaries, while
  // supabase-js exposes refresh lifecycle transitions as promises. Keep the
  // operation detached but handled so a provider failure is never unhandled.
  // The transitions are idempotent; the next AppState event retries the
  // desired state when this best-effort lifecycle hint fails.
  void action().catch(() => undefined)
}

function configureAuthLifecycle(client: SupabaseClient<Database>): void {
  const setRefreshState = (state: string) => {
    if (state === 'active') {
      runAuthLifecycleOperation(() => client.auth.startAutoRefresh())
    } else {
      runAuthLifecycleOperation(() => client.auth.stopAutoRefresh())
    }
  }
  setRefreshState(AppState.currentState)
  authLifecycleSubscription?.remove()
  authLifecycleSubscription = AppState.addEventListener('change', setRefreshState)
}

export function disposeSupabaseAuthLifecycle(): void {
  authLifecycleSubscription?.remove()
  authLifecycleSubscription = undefined
  const client = cachedClient
  if (client !== undefined) {
    runAuthLifecycleOperation(() => client.auth.stopAutoRefresh())
  }
}

/** Lazily constructs and caches the Supabase client from validated env. */
export function getSupabaseClient(): Result<SupabaseClient<Database>, AppError> {
  if (cachedClient) return ok(cachedClient)

  const envResult = loadSupabaseEnv()
  if (!envResult.ok) return envResult

  cachedClient = createClient<Database>(envResult.value.url, envResult.value.anonKey, {
    auth: {
      storage: secureStoreAdapter,
      // A personal session intentionally lives only for this app process.
      // Closing and reopening the app must return the user to sign-in.
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      lock: processLock,
    },
  })
  configureAuthLifecycle(cachedClient)
  return ok(cachedClient)
}
