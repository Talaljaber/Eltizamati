/**
 * Server-side decryption of the client-encrypted PII columns for the operator
 * dashboard (full_name / phone_number / primary_bank on profiles, nickname /
 * notes on obligations). The mobile app encrypts these with a per-user DEK
 * (apps/mobile/src/core/crypto/field-cipher.ts); the DB — and this dashboard's
 * service-role reads — only ever see `enc:v1:…` ciphertext.
 *
 * The master key (KEK) deliberately does NOT live in this app. Instead the
 * dashboard sends ciphertext to the `operator-decrypt` Edge Function — the one
 * place the KEK lives — authenticating with a shared operator token. That keeps
 * the security model's core claim true: nothing outside the Edge Function
 * boundary can turn ciphertext into plaintext. Here we only hold a token that
 * authorizes us to *ask* it to.
 *
 * Batched: one HTTP round-trip decrypts every field on a page. When the token or
 * Supabase URL is unset, or the call fails for any reason, values pass through
 * unchanged (columns render as ciphertext) rather than throwing — a decryption
 * outage must never blank the whole operator view.
 *
 * Server-only: imported solely from src/server/**, like everything holding a
 * secret in this app (enforced by the depcruise boundary rule).
 */
import { getDashboardEnv } from '../env'

export interface DecryptRequestItem {
  readonly userId: string
  readonly value: string | null | undefined
}

export interface FieldDecryptor {
  /**
   * Decrypts a batch of fields in one call. The returned array is aligned to
   * the input: element i is the plaintext for items[i]. Null/undefined inputs
   * come back as null; non-`enc:v1:` values and any decrypt failure come back
   * unchanged.
   */
  decrypt(items: readonly DecryptRequestItem[]): Promise<(string | null)[]>
}

const OPERATOR_DECRYPT_PATH = '/functions/v1/operator-decrypt'

/** Values as-is (undefined coerced to null) — used whenever real decryption is unavailable. */
function passthrough(items: readonly DecryptRequestItem[]): (string | null)[] {
  return items.map((it) => it.value ?? null)
}

let warnedNotConfigured = false

export function createFieldDecryptor(): FieldDecryptor {
  const env = getDashboardEnv()
  const token = env.operatorDecryptToken

  return {
    async decrypt(items) {
      if (items.length === 0) return []
      if (token === undefined) {
        if (!warnedNotConfigured) {
          warnedNotConfigured = true
          // eslint-disable-next-line no-console
          console.warn(
            'field-decryptor: OPERATOR_DECRYPT_TOKEN is not set — PII columns will render as ciphertext',
          )
        }
        return passthrough(items)
      }

      const payload = {
        items: items.map((it) => ({ userId: it.userId, value: it.value ?? null })),
      }

      try {
        const response = await fetch(`${env.supabaseUrl}${OPERATOR_DECRYPT_PATH}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Real gate: the shared operator token our function checks.
            'x-operator-token': token,
            // The Supabase gateway sits in front and requires a valid project JWT
            // unless verify_jwt is disabled. Rather than depend on that toggle,
            // present the (legacy-JWT) service-role key so the gateway always
            // routes us through to the function, where the operator token decides.
            Authorization: `Bearer ${env.supabaseSecretKey}`,
            apikey: env.supabaseSecretKey,
          },
          body: JSON.stringify(payload),
          cache: 'no-store',
        })
        if (!response.ok) {
          // Body carries the real reason (gateway auth vs. our 401/503/400) — read it once for
          // diagnosis. It never contains PII (only error codes), so it's safe to log.
          const body = await response.text().catch(() => '<unreadable>')
          // eslint-disable-next-line no-console
          console.error(
            `field-decryptor: operator-decrypt returned ${response.status} — ${body.slice(0, 300)}`,
          )
          return passthrough(items)
        }
        const data = (await response.json()) as { values?: unknown }
        if (!Array.isArray(data.values) || data.values.length !== items.length) {
          // eslint-disable-next-line no-console
          console.error('field-decryptor: operator-decrypt returned a malformed/mismatched batch')
          return passthrough(items)
        }
        return data.values.map((v) => (v === null || v === undefined ? null : String(v)))
      } catch {
        // Network/relay failure — never take down the page over it.
        // eslint-disable-next-line no-console
        console.error('field-decryptor: operator-decrypt request failed (ciphertext preserved)')
        return passthrough(items)
      }
    },
  }
}
