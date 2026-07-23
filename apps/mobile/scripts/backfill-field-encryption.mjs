/**
 * ONE-TIME backfill: encrypt the free-text PII columns for rows that were written BEFORE the
 * field-encryption feature shipped (or by the service-role dashboard) — the "29 legacy plaintext
 * obligations" etc. New writes from the app already encrypt themselves; this only touches the old
 * rows that are still plaintext.
 *
 * Columns encrypted (must match apps/mobile/src/core/crypto/field-cipher.ts):
 *   profiles.full_name, profiles.phone_number, profiles.primary_bank
 *   obligations.nickname, obligations.notes
 * Left plaintext on purpose: obligations.institution_name, profiles.email, all numeric fields.
 *
 * SECURITY NOTE: this is the ONE deliberate place the server holds the KEK and derives each
 * user's DEK to produce ciphertext. That is the trade-off for backfilling under a client-only
 * key model. Run it once from a trusted machine, never commit the env values, and delete your
 * local copy of the service-role key / KEK afterwards. Ongoing reads remain client-only.
 *
 * Idempotent: any value already prefixed `enc:v1:` is skipped, so re-running is safe.
 *
 * Ciphertext format (identical to the app + the user-encryption-key Edge Function):
 *   wrapped_dek : base64( nonce(12) || AES-256-GCM(KEK, dek) )      // WebCrypto/@noble compatible
 *   field       : "enc:v1:" + base64( nonce(12) || AES-256-GCM(dek, utf8(plaintext)) )
 *
 * Config is read from .env files (no need to export shell vars). The script auto-loads, in order:
 *     apps/mobile/scripts/.env         (put FIELD_ENC_KEK here — gitignored)
 *     apps/bank-simulator-dashboard/.env.local  (already has SUPABASE_URL + SUPABASE_SECRET_KEY)
 *     apps/mobile/.env                 (EXPO_PUBLIC_SUPABASE_URL fallback)
 *   or pass an explicit file:  node scripts/backfill-field-encryption.mjs --env ../../my.env
 *
 * Keys it looks for (first found wins):
 *     URL          : SUPABASE_URL            | EXPO_PUBLIC_SUPABASE_URL
 *     service role : SUPABASE_SERVICE_ROLE_KEY | SUPABASE_SECRET_KEY
 *     KEK          : FIELD_ENC_KEK   (the SAME base64 32-byte value set as the Edge Function secret)
 *
 * Run (from apps/mobile):
 *   node scripts/backfill-field-encryption.mjs            # dry run (reports, writes nothing)
 *   node scripts/backfill-field-encryption.mjs --apply    # actually writes
 */
import { createClient } from '@supabase/supabase-js'
import { gcm } from '@noble/ciphers/aes.js'
import { randomBytes } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APPLY = process.argv.includes('--apply')

// --- load .env files (Node >=20.6 process.loadEnvFile; each file is optional) ---
const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '../../..')
const envArgIndex = process.argv.indexOf('--env')
const explicitEnv = envArgIndex !== -1 ? process.argv[envArgIndex + 1] : undefined
const envFiles = explicitEnv
  ? [resolve(process.cwd(), explicitEnv)]
  : [
      resolve(scriptDir, '.env'),
      resolve(repoRoot, 'apps/bank-simulator-dashboard/.env.local'),
      resolve(repoRoot, 'apps/mobile/.env'),
    ]
const loaded = []
for (const file of envFiles) {
  try {
    process.loadEnvFile(file)
    loaded.push(file)
  } catch {
    // file missing / unreadable — skip; the presence check below reports what's still needed.
  }
}

const URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const KEK_B64 = process.env.FIELD_ENC_KEK

if (!URL || !SERVICE_ROLE || !KEK_B64) {
  console.error('Missing configuration. Loaded .env files:', loaded.length ? loaded : '(none found)')
  console.error('Still missing:', [
    !URL && 'SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL',
    !SERVICE_ROLE && 'SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY',
    !KEK_B64 && 'FIELD_ENC_KEK',
  ].filter(Boolean).join(', '))
  process.exit(1)
}

const KEK = new Uint8Array(Buffer.from(KEK_B64, 'base64'))
if (KEK.length !== 32) {
  console.error(`FIELD_ENC_KEK must decode to 32 bytes, got ${KEK.length}. Aborting.`)
  process.exit(1)
}

const PREFIX = 'enc:v1:'
const NONCE = 12
const DEK_LEN = 32

const toB64 = (u8) => Buffer.from(u8).toString('base64')
const fromB64 = (s) => new Uint8Array(Buffer.from(s, 'base64'))

function concat(a, b) {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

function wrapDek(dek) {
  const nonce = new Uint8Array(randomBytes(NONCE))
  return toB64(concat(nonce, gcm(KEK, nonce).encrypt(dek)))
}
function unwrapDek(wrapped) {
  const combined = fromB64(wrapped)
  return gcm(KEK, combined.slice(0, NONCE)).decrypt(combined.slice(NONCE))
}
function encryptField(dek, plaintext) {
  const nonce = new Uint8Array(randomBytes(NONCE))
  const ct = gcm(dek, nonce).encrypt(new TextEncoder().encode(plaintext))
  return PREFIX + toB64(concat(nonce, ct))
}

const admin = createClient(URL, SERVICE_ROLE, { auth: { persistSession: false } })

// Per-user DEK cache; provisions a wrapped DEK row if the user never got one (same logic as the
// user-encryption-key Edge Function), so users who never opened the updated app still get encrypted.
const dekCache = new Map()
async function getDek(userId) {
  if (dekCache.has(userId)) return dekCache.get(userId)
  const { data, error } = await admin
    .from('user_encryption_keys')
    .select('wrapped_dek')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  let dek
  if (data) {
    dek = unwrapDek(data.wrapped_dek)
  } else {
    dek = new Uint8Array(randomBytes(DEK_LEN))
    if (APPLY) {
      const { error: insErr } = await admin
        .from('user_encryption_keys')
        .insert({ user_id: userId, wrapped_dek: wrapDek(dek), dek_version: 1 })
      if (insErr && insErr.code === '23505') {
        const { data: w } = await admin
          .from('user_encryption_keys')
          .select('wrapped_dek')
          .eq('user_id', userId)
          .single()
        dek = unwrapDek(w.wrapped_dek)
      } else if (insErr) {
        throw insErr
      }
    }
  }
  dekCache.set(userId, dek)
  return dek
}

const needsEncryption = (v) => typeof v === 'string' && v.length > 0 && !v.startsWith(PREFIX)

async function backfillProfiles() {
  const { data, error } = await admin
    .from('profiles')
    .select('user_id, full_name, phone_number, primary_bank')
  if (error) throw error
  let touched = 0
  for (const row of data ?? []) {
    const patch = {}
    if (needsEncryption(row.full_name)) patch.full_name = row.full_name
    if (needsEncryption(row.phone_number)) patch.phone_number = row.phone_number
    if (needsEncryption(row.primary_bank)) patch.primary_bank = row.primary_bank
    if (Object.keys(patch).length === 0) continue
    touched++
    const dek = await getDek(row.user_id)
    for (const k of Object.keys(patch)) patch[k] = encryptField(dek, patch[k])
    if (APPLY) {
      const { error: upErr } = await admin.from('profiles').update(patch).eq('user_id', row.user_id)
      if (upErr) throw upErr
    }
  }
  console.log(`profiles: ${touched} row(s) ${APPLY ? 'encrypted' : 'would be encrypted'}`)
}

async function backfillObligations() {
  const { data, error } = await admin.from('obligations').select('id, user_id, nickname, notes')
  if (error) throw error
  let touched = 0
  for (const row of data ?? []) {
    const patch = {}
    if (needsEncryption(row.nickname)) patch.nickname = row.nickname
    if (needsEncryption(row.notes)) patch.notes = row.notes
    if (Object.keys(patch).length === 0) continue
    touched++
    const dek = await getDek(row.user_id)
    for (const k of Object.keys(patch)) patch[k] = encryptField(dek, patch[k])
    if (APPLY) {
      const { error: upErr } = await admin.from('obligations').update(patch).eq('id', row.id)
      if (upErr) throw upErr
    }
  }
  console.log(`obligations: ${touched} row(s) ${APPLY ? 'encrypted' : 'would be encrypted'}`)
}

async function main() {
  console.log(APPLY ? '=== APPLY mode: writing changes ===' : '=== DRY RUN: no writes (pass --apply to write) ===')
  await backfillProfiles()
  await backfillObligations()
  console.log('Done. Re-run supabase/tests/manual/verify-encryption.sql to confirm.')
}

main().catch((err) => {
  console.error('Backfill failed:', err?.message ?? err)
  process.exit(1)
})
