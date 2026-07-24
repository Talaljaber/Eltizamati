// Operator-side batch decryption for the bank-simulator dashboard. The dashboard has no
// signed-in user (it runs as service role over every account), so it cannot use
// user-encryption-key/index.ts, which only ever returns the *caller's own* DEK. This function
// is the deliberate operator path: it unwraps ANY user's DEK under the KEK and decrypts the
// client-encrypted PII fields the dashboard needs to display.
//
// Why this keeps the security model intact: the KEK (FIELD_ENC_KEK) still lives ONLY inside
// Edge Functions — never in Postgres, never in the dashboard. The dashboard is just an
// authorized *caller*, gated by a shared operator token (OPERATOR_DECRYPT_TOKEN) it and this
// function both hold. So "nothing outside the Edge Function boundary can decrypt" remains true.
//
// Deploy with JWT verification OFF (there is no user JWT to verify) — the operator token is the
// gate: `supabase functions deploy operator-decrypt --no-verify-jwt` (also set in config.toml).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CIPHERTEXT_PREFIX = 'enc:v1:'
const NONCE_LENGTH = 12 // bytes; matches user-encryption-key's wrap format and field-cipher.ts

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-operator-token',
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Constant-time string compare so the token check can't be timing-probed. */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

async function importKek(kekBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(kekBase64), { name: 'AES-GCM' }, false, [
    'decrypt',
  ])
}

async function unwrapDek(wrapped: string, kek: CryptoKey): Promise<CryptoKey> {
  const combined = fromBase64(wrapped)
  const nonce = combined.slice(0, NONCE_LENGTH)
  const ciphertext = combined.slice(NONCE_LENGTH)
  const dek = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, kek, ciphertext),
  )
  return crypto.subtle.importKey('raw', dek, { name: 'AES-GCM' }, false, ['decrypt'])
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

type DecryptItem = { userId: string; value: string | null }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const expectedToken = Deno.env.get('OPERATOR_DECRYPT_TOKEN')
  if (!expectedToken) {
    console.error('operator-decrypt: OPERATOR_DECRYPT_TOKEN is not configured')
    return jsonResponse({ error: 'operator decryption not configured' }, 503)
  }
  const presentedToken = req.headers.get('x-operator-token')
  if (presentedToken === null || !timingSafeEqual(presentedToken, expectedToken)) {
    return jsonResponse({ error: 'unauthorized' }, 401)
  }

  const kekBase64 = Deno.env.get('FIELD_ENC_KEK')
  if (!kekBase64) {
    console.error('operator-decrypt: FIELD_ENC_KEK is not configured')
    return jsonResponse({ error: 'encryption not configured' }, 503)
  }

  let items: DecryptItem[]
  try {
    const body = (await req.json()) as { items?: unknown }
    if (!Array.isArray(body.items)) return jsonResponse({ error: 'items must be an array' }, 400)
    items = body.items.map((raw) => {
      const it = raw as { userId?: unknown; value?: unknown }
      if (typeof it.userId !== 'string') throw new Error('bad item')
      const value = it.value === null || it.value === undefined ? null : String(it.value)
      return { userId: it.userId, value }
    })
  } catch {
    return jsonResponse({ error: 'invalid request body' }, 400)
  }

  // Service-role client — only reads the wrapped DEKs; the KEK does the actual unwrap in memory.
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Only the users actually referenced in this batch are fetched.
  const userIds = [...new Set(items.map((it) => it.userId))]
  const { data: keyRows, error: keysError } = await adminClient
    .from('user_encryption_keys')
    .select('user_id, wrapped_dek')
    .in('user_id', userIds)
  if (keysError !== null) {
    console.error('operator-decrypt: could not load keys', { message: keysError.message })
    return jsonResponse({ error: 'key lookup failed' }, 500)
  }

  const kek = await importKek(kekBase64)
  const keyByUserId = new Map<string, CryptoKey>()
  for (const row of keyRows) {
    try {
      keyByUserId.set(row.user_id, await unwrapDek(row.wrapped_dek, kek))
    } catch {
      // A single unwrap failure (corrupt row / wrong KEK) must not fail the batch — that user's
      // fields simply stay as ciphertext. Never log the wrapped value itself (NFR-SEC-004).
      console.error('operator-decrypt: DEK unwrap failed for a user (ciphertext preserved)')
    }
  }

  // Decrypt in input order. Non-prefixed values (pre-encryption/demo plaintext) and users with
  // no key pass through unchanged; a decrypt failure returns the original rather than throwing.
  const values = await Promise.all(
    items.map(async ({ userId, value }) => {
      if (value === null || !value.startsWith(CIPHERTEXT_PREFIX)) return value
      const key = keyByUserId.get(userId)
      if (key === undefined) return value
      try {
        const combined = fromBase64(value.slice(CIPHERTEXT_PREFIX.length))
        const nonce = combined.slice(0, NONCE_LENGTH)
        const ciphertext = combined.slice(NONCE_LENGTH)
        const plaintext = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: nonce },
          key,
          ciphertext,
        )
        return new TextDecoder().decode(plaintext)
      } catch {
        console.error('operator-decrypt: field decryption failed (ciphertext preserved)')
        return value
      }
    }),
  )

  return jsonResponse({ values }, 200)
})
