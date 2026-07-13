/**
 * Adapts expo-secure-store to the `SupportedStorage` shape supabase-js's
 * auth client expects, so session/refresh tokens land in the OS Keychain
 * (iOS) / Keystore (Android) rather than AsyncStorage (NFR-SEC-003, T-04).
 *
 * SecureStore rejects values over ~2048 bytes on iOS. A real Supabase
 * session (JWT access token + refresh token + full user object, including
 * identities/metadata) regularly exceeds that — confirmed against a real
 * session's access token alone (935 bytes; the full session JSON is
 * larger). supabase-js `await`s `storage.setItem(...)` directly with no
 * catch (see auth-js's `setItemAsync` helper), so a rejected write there
 * propagates as a rejected `signInWithPassword`/`signUp` promise — values
 * over the limit are split across `${key}_0`, `${key}_1`, ... with a small
 * manifest under the original key, rather than written as one oversized
 * item. No new dependency: SecureStore already encrypts each item via
 * Keychain/Keystore, so chunking alone (no additional crypto) is sufficient.
 */
import * as SecureStore from 'expo-secure-store'

export interface SupportedStorage {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

// Comfortably under the ~2048-byte iOS Keychain limit, leaving headroom for
// UTF-8 multi-byte expansion and the key's own storage overhead.
const CHUNK_SIZE = 1800
const MANIFEST_PREFIX = '__chunked__:'

function chunksOf(value: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size))
  }
  return chunks
}

async function readChunked(key: string, chunkCount: number): Promise<string | null> {
  const chunks = await Promise.all(
    Array.from({ length: chunkCount }, (_, index) => SecureStore.getItemAsync(`${key}_${index}`)),
  )
  // A missing chunk means the entry is corrupted or was only partially
  // written — treat as absent rather than returning truncated/garbled data.
  if (chunks.some((chunk) => chunk === null)) return null
  return chunks.join('')
}

async function deleteChunks(key: string, chunkCount: number): Promise<void> {
  await Promise.all(
    Array.from({ length: chunkCount }, (_, index) =>
      SecureStore.deleteItemAsync(`${key}_${index}`),
    ),
  )
}

function parseManifest(stored: string): number | undefined {
  if (!stored.startsWith(MANIFEST_PREFIX)) return undefined
  const count = Number(stored.slice(MANIFEST_PREFIX.length))
  return Number.isInteger(count) && count > 0 ? count : undefined
}

export const secureStoreAdapter: SupportedStorage = {
  async getItem(key: string): Promise<string | null> {
    const stored = await SecureStore.getItemAsync(key)
    if (stored === null) return null
    const chunkCount = parseManifest(stored)
    if (chunkCount === undefined) return stored
    return readChunked(key, chunkCount)
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value)
      return
    }
    const chunks = chunksOf(value, CHUNK_SIZE)
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}_${index}`, chunk)),
    )
    // Written last so a value is never observed as chunked before all of its
    // chunks exist.
    await SecureStore.setItemAsync(key, `${MANIFEST_PREFIX}${chunks.length}`)
  },

  async removeItem(key: string): Promise<void> {
    const stored = await SecureStore.getItemAsync(key).catch(() => null)
    const chunkCount = stored === null ? undefined : parseManifest(stored)
    if (chunkCount !== undefined) {
      await deleteChunks(key, chunkCount)
    }
    await SecureStore.deleteItemAsync(key)
  },
}
