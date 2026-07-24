// Provisions (once) and returns the caller's per-user field-encryption DEK, used by the
// mobile app to encrypt/decrypt the free-text PII columns (profiles.full_name/phone_number/
// primary_bank, obligations.nickname/notes) client-side before they ever reach Postgres.
//
// Envelope encryption: this function is the ONLY place the KEK (master key, an Edge Function
// secret) and a user's raw DEK are ever both in memory together. Postgres only ever sees the
// DEK wrapped (encrypted) under the KEK — a DB dump or a leaked service_role key yields
// ciphertext the attacker cannot open. The raw DEK returned here is deliberately not stored
// server-side in plaintext anywhere; it is cached client-side in expo-secure-store
// (Keychain/Keystore) by apps/mobile/src/core/crypto/field-cipher.ts.
//
// Auth pattern mirrors delete-account/index.ts (the canonical Edge Function in this repo):
// authenticate the caller as themselves via an anon-key client + their JWT before ever
// touching the service-role client (NFR-SEC-001 — service role never trusts a client-supplied
// user id).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const NONCE_LENGTH = 12 // bytes; standard AES-GCM nonce size
const DEK_LENGTH = 32 // bytes; AES-256 key

// Mirrors learn-assistant/index.ts. Without these the browser preflight (Expo web
// on http://localhost:8081) is blocked before the request ever reaches the auth
// check. Native builds don't send preflights, so this only affects web.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

async function importKek(kekBase64: string): Promise<CryptoKey> {
  const raw = fromBase64(kekBase64)
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/** Wrapped format: base64(nonce || AES-GCM(kek, dek)) — ciphertext includes the auth tag (WebCrypto appends it). */
async function wrapDek(dek: Uint8Array, kek: CryptoKey): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, kek, dek),
  )
  const combined = new Uint8Array(nonce.length + ciphertext.length)
  combined.set(nonce, 0)
  combined.set(ciphertext, nonce.length)
  return toBase64(combined)
}

async function unwrapDek(wrapped: string, kek: CryptoKey): Promise<Uint8Array> {
  const combined = fromBase64(wrapped)
  const nonce = combined.slice(0, NONCE_LENGTH)
  const ciphertext = combined.slice(NONCE_LENGTH)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, kek, ciphertext)
  return new Uint8Array(plaintext)
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (authHeader === null) {
    return jsonResponse({ error: 'missing Authorization header' }, 401)
  }

  const kekBase64 = Deno.env.get('FIELD_ENC_KEK')
  if (!kekBase64) {
    // eslint-disable-next-line no-console
    console.error('user-encryption-key: FIELD_ENC_KEK is not configured')
    return jsonResponse({ error: 'encryption not configured' }, 503)
  }

  // Authenticate the caller as themselves (anon-key client + their JWT) — never trust a
  // client-supplied user id.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )
  const {
    data: { user },
    error: getUserError,
  } = await callerClient.auth.getUser()
  if (getUserError !== null || user === null) {
    return jsonResponse({ error: 'invalid session' }, 401)
  }

  // Service-role client — only path in this function allowed to hold this key.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const kek = await importKek(kekBase64)

  const { data: existing, error: selectError } = await adminClient
    .from('user_encryption_keys')
    .select('wrapped_dek, dek_version')
    .eq('user_id', user.id)
    .maybeSingle()
  if (selectError !== null) {
    console.error('user-encryption-key: lookup failed', { message: selectError.message })
    return jsonResponse({ error: selectError.message }, 500)
  }

  if (existing !== null) {
    const dek = await unwrapDek(existing.wrapped_dek, kek)
    return jsonResponse({ dek: toBase64(dek), version: existing.dek_version }, 200)
  }

  // First request for this user: provision a fresh DEK and persist it wrapped.
  const dek = crypto.getRandomValues(new Uint8Array(DEK_LENGTH))
  const wrappedDek = await wrapDek(dek, kek)
  const { error: insertError } = await adminClient
    .from('user_encryption_keys')
    .insert({ user_id: user.id, wrapped_dek: wrappedDek, dek_version: 1 })
  if (insertError !== null) {
    // 23505 = unique_violation: a concurrent request from the same user (e.g. two devices/tabs
    // signing in at once) already provisioned a row. That row is authoritative — fetch and
    // unwrap it instead of failing; the DEK generated just above is discarded, not persisted.
    if (insertError.code === '23505') {
      const { data: winner, error: refetchError } = await adminClient
        .from('user_encryption_keys')
        .select('wrapped_dek, dek_version')
        .eq('user_id', user.id)
        .single()
      if (refetchError !== null || winner === null) {
        console.error('user-encryption-key: post-race refetch failed', {
          message: refetchError?.message,
        })
        return jsonResponse({ error: 'key provisioning race could not be resolved' }, 500)
      }
      const winnerDek = await unwrapDek(winner.wrapped_dek, kek)
      return jsonResponse({ dek: toBase64(winnerDek), version: winner.dek_version }, 200)
    }
    console.error('user-encryption-key: provisioning failed', { message: insertError.message })
    return jsonResponse({ error: insertError.message }, 500)
  }

  return jsonResponse({ dek: toBase64(dek), version: 1 }, 200)
})
