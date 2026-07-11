/**
 * Supabase client — the only place `createClient` is called (Phase 4,
 * ADR-0017). Never constructed for demo mode; demo mode never imports
 * this module (composition-root only calls it when `dataMode === 'personal'`).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ok, type Result, type AppError } from '@eltizamati/domain'
import type { Database } from './database.types'
import { loadSupabaseEnv } from '../config/env'
import { secureStoreAdapter } from './secure-store-adapter'

let cachedClient: SupabaseClient<Database> | undefined

/** Lazily constructs and caches the Supabase client from validated env. */
export function getSupabaseClient(): Result<SupabaseClient<Database>, AppError> {
  if (cachedClient) return ok(cachedClient)

  const envResult = loadSupabaseEnv()
  if (!envResult.ok) return envResult

  cachedClient = createClient<Database>(envResult.value.url, envResult.value.anonKey, {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  return ok(cachedClient)
}
