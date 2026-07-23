/**
 * Client-only AES-256-GCM encryption for free-text PII columns (profiles.full_name/
 * phone_number/primary_bank, obligations.nickname/notes) — the encryption plan agreed with
 * the user: a per-user Data Encryption Key (DEK) that only this user's authenticated device
 * can obtain, so a DB dump or a leaked service_role key yields ciphertext, never plaintext.
 *
 * Key lifecycle: the DEK is fetched (and, on first use, provisioned) from the
 * `user-encryption-key` Edge Function, which unwraps it server-side under a KEK that never
 * touches Postgres (see supabase/migrations/20260723000000_user_encryption_keys.sql). It is
 * cached here **in memory only, for the lifetime of the app process** — deliberately not
 * persisted to expo-secure-store. The Supabase client already runs with
 * `persistSession: false` (apps/mobile/src/core/supabase/client.ts): every app relaunch
 * already requires a fresh sign-in, so persisting the DEK across restarts would add a second
 * place for sensitive material to leak without buying back any usability the session model
 * doesn't already give up. `clearFieldEncryptionKey()` is called from the same local
 * sign-out/user-boundary cleanup that already wipes every other per-user cache.
 */
import * as Crypto from 'expo-crypto'
import { gcm } from '@noble/ciphers/aes.js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { err, makeError, ok, type AppError, type Result } from '@eltizamati/domain'

const CIPHERTEXT_PREFIX = 'enc:v1:'
const NONCE_LENGTH = 12 // bytes; standard AES-GCM nonce size, matches the Edge Function's wrap format

let cachedDek: Uint8Array | undefined
let inFlightFetch: Promise<Result<Uint8Array, AppError>> | undefined

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function fetchDek(client: SupabaseClient): Promise<Result<Uint8Array, AppError>> {
  const { data, error } = await client.functions.invoke('user-encryption-key')
  if (error !== null) {
    return err(mapInvokeError(error))
  }
  const body = data as { dek?: unknown } | null
  if (typeof body?.dek !== 'string') {
    return err(makeError('unexpected', { safeMetadata: { reason: 'malformed_dek_response' } }))
  }
  return ok(fromBase64(body.dek))
}

/**
 * Turns a supabase-js `functions.invoke` error into a correctly-typed AppError instead of a
 * blanket `connectivity` (which the UI renders as "You're offline"). Only a genuine fetch
 * failure is connectivity; a non-2xx HTTP response means the function was reached and the real
 * status is what matters for diagnosis (503 = FIELD_ENC_KEK unset, 401 = no session, 404 = not
 * deployed). The status is put in safeMetadata so it shows in the debug panel — it is not PII.
 */
function mapInvokeError(error: unknown): AppError {
  const name = (error as { name?: unknown })?.name
  // FunctionsFetchError: the request never got an HTTP response (device really is offline).
  if (name === 'FunctionsFetchError') {
    return makeError('connectivity', { safeMetadata: { source: 'user-encryption-key' } })
  }
  // FunctionsHttpError: a non-2xx response — error.context is the Response, so status is known.
  const status = (error as { context?: { status?: unknown } })?.context?.status
  const safeMetadata: Record<string, string | number> = { source: 'user-encryption-key' }
  if (typeof status === 'number') safeMetadata.status = status
  if (status === 401 || status === 403) {
    // No/invalid session reached the function — the caller isn't authenticated yet.
    return makeError('auth', { safeMetadata })
  }
  // 503 (key not configured), 404 (not deployed), 500, or an unknown relay error: the encryption
  // service is unavailable, not the network. Retryable, with a message distinct from "offline".
  return makeError('providerUnavailable', { safeMetadata })
}

async function getDek(client: SupabaseClient): Promise<Result<Uint8Array, AppError>> {
  if (cachedDek !== undefined) return ok(cachedDek)
  if (inFlightFetch === undefined) {
    inFlightFetch = fetchDek(client).finally(() => {
      inFlightFetch = undefined
    })
  }
  const result = await inFlightFetch
  if (result.ok) cachedDek = result.value
  return result
}

/** Called from local sign-out/user-boundary cleanup — never leave a prior user's DEK cached. */
export function clearFieldEncryptionKey(): void {
  cachedDek = undefined
  inFlightFetch = undefined
}

/** Encrypts a plaintext field value. Empty string is still encrypted (not a sentinel for "absent" — callers gate null/undefined before calling). */
export async function encryptField(
  client: SupabaseClient,
  plaintext: string,
): Promise<Result<string, AppError>> {
  const dekResult = await getDek(client)
  if (!dekResult.ok) return dekResult

  const nonce = Crypto.getRandomBytes(NONCE_LENGTH)
  const ciphertext = gcm(dekResult.value, nonce).encrypt(new TextEncoder().encode(plaintext))
  const combined = new Uint8Array(nonce.length + ciphertext.length)
  combined.set(nonce, 0)
  combined.set(ciphertext, nonce.length)
  return ok(CIPHERTEXT_PREFIX + toBase64(combined))
}

/**
 * Decrypts a stored field value. Any value without the `enc:v1:` prefix is returned
 * unchanged — this makes the cipher tolerant of pre-existing plaintext rows (data written
 * before this feature shipped, demo-seeded fixtures, service-role/dashboard writes) without a
 * destructive backfill: rows simply re-encrypt themselves the next time the owning user saves.
 */
export async function decryptField(
  client: SupabaseClient,
  stored: string,
): Promise<Result<string, AppError>> {
  if (!stored.startsWith(CIPHERTEXT_PREFIX)) return ok(stored)

  const dekResult = await getDek(client)
  if (!dekResult.ok) return dekResult

  const combined = fromBase64(stored.slice(CIPHERTEXT_PREFIX.length))
  const nonce = combined.slice(0, NONCE_LENGTH)
  const ciphertext = combined.slice(NONCE_LENGTH)
  try {
    const plaintext = gcm(dekResult.value, nonce).decrypt(ciphertext)
    return ok(new TextDecoder().decode(plaintext))
  } catch (error) {
    // Never include the ciphertext/plaintext in the error (NFR-SEC-004) — only that decryption
    // failed, e.g. a wrong/rotated key or corrupted data.
    return err(makeError('unexpected', { safeMetadata: { reason: 'field_decrypt_failed' }, cause: error }))
  }
}
