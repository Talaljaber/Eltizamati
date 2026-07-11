/**
 * Adapts expo-secure-store to the `SupportedStorage` shape supabase-js's
 * auth client expects, so session/refresh tokens land in the OS Keychain
 * (iOS) / Keystore (Android) rather than AsyncStorage (NFR-SEC-003, T-04).
 *
 * SecureStore rejects values over ~2048 bytes on iOS. A typical Supabase
 * session JSON (short-lived JWT + refresh token) stays under that in
 * practice; if verification against a real session shows otherwise, the
 * documented fix is the chunked/AES-encrypted storage pattern from
 * Supabase's own Expo guide — deliberately not added here since it pulls
 * in an additional crypto dependency (AI_AGENT_RULES §12) with no ADR yet.
 */
import * as SecureStore from 'expo-secure-store'

export interface SupportedStorage {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

export const secureStoreAdapter: SupportedStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}
