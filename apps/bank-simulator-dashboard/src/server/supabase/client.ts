/**
 * Service-role Supabase client — the only place `createClient` is called in
 * this app (mirrors `apps/mobile/src/core/supabase/client.ts`'s role, but
 * with the SECRET key, never the anon key: this dashboard has no signed-in
 * user, so RLS can never authorize it — `SUPABASE_SECRET_KEY` bypasses RLS
 * entirely and is the only way this app can read across all personal accounts).
 *
 * The demo user-id allowlist has been removed: the dashboard reads every
 * account, and outgoing email/notification is instead gated per recipient by
 * their own consent (`isRecipientConsented`). Bypassing RLS means there is no
 * database-level backstop here for reads — that is an accepted property of
 * this operator-only dashboard.
 *
 * This module — and everything importing `@supabase/supabase-js` in this
 * app — must stay inside `src/server/**`, enforced by the depcruise rule
 * `no-supabase-outside-dashboard-server-boundary` in `.dependency-cruiser.cjs`.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ok, type Result, type AppError } from '@eltizamati/domain'
import type { Database } from './database.types'
import { getDashboardEnv } from '../env'

let cachedClient: SupabaseClient<Database> | undefined

export function getServiceRoleSupabaseClient(): Result<SupabaseClient<Database>, AppError> {
  if (cachedClient !== undefined) return ok(cachedClient)

  const env = getDashboardEnv()
  cachedClient = createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      // No session to persist or refresh — this client acts as the service
      // role for every request, never on behalf of a signed-in user.
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
  return ok(cachedClient)
}

/** Test-only: clears the memoized client so a test can reconstruct with fresh env. */
export function resetServiceRoleClientForTests(): void {
  cachedClient = undefined
}
