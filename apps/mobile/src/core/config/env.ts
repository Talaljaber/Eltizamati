/**
 * Typed Supabase environment config (Phase 4, ADR-0017).
 *
 * Only the anon key is ever read here. The service-role key has no
 * `EXPO_PUBLIC_` variant and must never be bundled into client code
 * (NFR-SEC-002/003) — if it's needed anywhere, that's an Edge Function
 * concern, not this app.
 *
 * `process.env.EXPO_PUBLIC_*` is read exactly once, at module scope, in the
 * literal dot-access form Metro's babel-preset-expo statically inlines at
 * build time — required for the real value to reach the bundle at all.
 * `loadSupabaseEnv` takes that captured value as a default parameter rather
 * than reading `process.env` inside the function body, so tests can pass a
 * fake raw value directly instead of mutating `process.env` (which has no
 * effect once babel has already inlined the module-scope literal).
 */
import { z } from 'zod'
import { err, ok, makeError, type Result, type AppError } from '@eltizamati/domain'

export interface RawSupabaseEnv {
  readonly url: string | undefined
  readonly anonKey: string | undefined
}

const rawEnvFromProcess: RawSupabaseEnv = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
}

const supabaseEnvSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
})

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>

export function loadSupabaseEnv(
  raw: RawSupabaseEnv = rawEnvFromProcess,
): Result<SupabaseEnv, AppError> {
  const parsed = supabaseEnvSchema.safeParse(raw)
  if (!parsed.success) {
    return err(
      makeError('unexpected', {
        safeMetadata: { missingOrInvalidFields: parsed.error.issues.length },
        recoveryHint:
          'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env (see .env.example).',
      }),
    )
  }
  return ok(parsed.data)
}
