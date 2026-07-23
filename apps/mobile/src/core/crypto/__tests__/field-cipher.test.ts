import type { SupabaseClient } from '@supabase/supabase-js'
import {
  clearFieldEncryptionKey,
  decryptField,
  encryptField,
} from '../field-cipher'

// Deterministic nonce so ciphertext is reproducible within a test; encryptField still produces
// a distinct nonce+ciphertext per real call in production via expo-crypto's CSPRNG.
jest.mock('expo-crypto', () => ({
  getRandomBytes: (length: number) => new Uint8Array(length).fill(7),
}))

// A fixed 32-byte DEK, base64-encoded, as the Edge Function would return it.
const DEK_BYTES = new Uint8Array(32).map((_, i) => (i * 7 + 1) & 0xff)
function base64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
const DEK_BASE64 = base64(DEK_BYTES)

function makeClient(invoke: jest.Mock): SupabaseClient {
  return { functions: { invoke } } as unknown as SupabaseClient
}

function makeInvoke(): jest.Mock {
  return jest.fn().mockResolvedValue({ data: { dek: DEK_BASE64 }, error: null })
}

describe('field-cipher', () => {
  beforeEach(() => {
    clearFieldEncryptionKey()
  })

  it('round-trips plaintext through encrypt/decrypt', async () => {
    const client = makeClient(makeInvoke())
    const encrypted = await encryptField(client, 'Talal Jaber')
    expect(encrypted.ok).toBe(true)
    if (!encrypted.ok) return
    expect(encrypted.value.startsWith('enc:v1:')).toBe(true)

    const decrypted = await decryptField(client, encrypted.value)
    expect(decrypted).toEqual({ ok: true, value: 'Talal Jaber' })
  })

  it('round-trips Arabic and empty strings', async () => {
    const client = makeClient(makeInvoke())
    for (const plaintext of ['طلال جابر', '', '+962790000000']) {
      const encrypted = await encryptField(client, plaintext)
      expect(encrypted.ok).toBe(true)
      if (!encrypted.ok) return
      const decrypted = await decryptField(client, encrypted.value)
      expect(decrypted).toEqual({ ok: true, value: plaintext })
    }
  })

  it('passes through values without the enc:v1: prefix unchanged (legacy plaintext / demo data)', async () => {
    // No DEK fetch should even be attempted for a plaintext pass-through.
    const invoke = makeInvoke()
    const client = makeClient(invoke)
    const result = await decryptField(client, 'Arab Bank')
    expect(result).toEqual({ ok: true, value: 'Arab Bank' })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('fetches the DEK once and caches it across calls', async () => {
    const invoke = makeInvoke()
    const client = makeClient(invoke)
    const first = await encryptField(client, 'a')
    await encryptField(client, 'b')
    if (first.ok) await decryptField(client, first.value)
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('maps a genuine fetch failure to connectivity ("offline")', async () => {
    const fetchError = Object.assign(new Error('failed to fetch'), { name: 'FunctionsFetchError' })
    const invoke = jest.fn().mockResolvedValue({ data: null, error: fetchError })
    const result = await encryptField(makeClient(invoke), 'x')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('connectivity')
  })

  it('maps a 503 (KEK not configured) to providerUnavailable, not connectivity', async () => {
    const httpError = Object.assign(new Error('service unavailable'), {
      name: 'FunctionsHttpError',
      context: { status: 503 },
    })
    const invoke = jest.fn().mockResolvedValue({ data: null, error: httpError })
    const result = await encryptField(makeClient(invoke), 'x')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('providerUnavailable')
    expect(result.error.safeMetadata?.status).toBe(503)
  })

  it('maps a 401 (no session) to an auth error', async () => {
    const httpError = Object.assign(new Error('unauthorized'), {
      name: 'FunctionsHttpError',
      context: { status: 401 },
    })
    const invoke = jest.fn().mockResolvedValue({ data: null, error: httpError })
    const result = await encryptField(makeClient(invoke), 'x')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('auth')
  })

  it('fails closed when decrypting with the wrong key', async () => {
    const goodClient = makeClient(makeInvoke())
    const encrypted = await encryptField(goodClient, 'secret')
    expect(encrypted.ok).toBe(true)
    if (!encrypted.ok) return

    clearFieldEncryptionKey()
    const wrongDek = base64(new Uint8Array(32).fill(9))
    const wrongClient = makeClient(
      jest.fn().mockResolvedValue({ data: { dek: wrongDek }, error: null }),
    )
    const result = await decryptField(wrongClient, encrypted.value)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.safeMetadata?.reason).toBe('field_decrypt_failed')
  })
})
