import * as SecureStore from 'expo-secure-store'
import { secureStoreAdapter } from '../secure-store-adapter'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

describe('secureStoreAdapter', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('getItem delegates to SecureStore.getItemAsync with the given key', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('stored-value')

    const result = await secureStoreAdapter.getItem('sb-session')

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('sb-session')
    expect(result).toBe('stored-value')
  })

  it('getItem returns null when nothing is stored', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(null)

    const result = await secureStoreAdapter.getItem('missing-key')

    expect(result).toBeNull()
  })

  it('setItem delegates to SecureStore.setItemAsync with key and value when under the chunk threshold', async () => {
    jest.mocked(SecureStore.setItemAsync).mockResolvedValueOnce(undefined)

    await secureStoreAdapter.setItem('sb-session', 'token-value')

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sb-session', 'token-value')
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1)
  })

  it('removeItem delegates to SecureStore.deleteItemAsync with the given key', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('stored-value')
    jest.mocked(SecureStore.deleteItemAsync).mockResolvedValueOnce(undefined)

    await secureStoreAdapter.removeItem('sb-session')

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session')
  })

  describe('values over the ~2048-byte SecureStore limit (e.g. a real Supabase session)', () => {
    // Longer than CHUNK_SIZE (1800) so setItem must split it — this is the
    // regression case: a Supabase session JSON regularly exceeds this size
    // (a real access token alone measured 935 bytes), and iOS Keychain
    // rejects single items over ~2048 bytes.
    const largeValue = 'x'.repeat(4500)

    it('setItem splits the value across chunk keys instead of one oversized item', async () => {
      jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined)

      await secureStoreAdapter.setItem('sb-session', largeValue)

      // No single write exceeds the safe size.
      for (const call of jest.mocked(SecureStore.setItemAsync).mock.calls) {
        expect(call[1].length).toBeLessThanOrEqual(1800)
      }
      // The manifest (keyed by the original key) is written last, after all chunks.
      const calls = jest.mocked(SecureStore.setItemAsync).mock.calls
      const manifestCall = calls[calls.length - 1]
      expect(manifestCall[0]).toBe('sb-session')
      expect(manifestCall[1]).toMatch(/^__chunked__:\d+$/)
    })

    it('getItem reassembles a chunked value back to the original string', async () => {
      // Simulate what setItem would have written: capture real chunk calls,
      // then serve them back from getItemAsync keyed by whatever key was used.
      const store = new Map<string, string>()
      jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
        store.set(key, value)
      })
      jest
        .mocked(SecureStore.getItemAsync)
        .mockImplementation(async (key) => store.get(key) ?? null)

      await secureStoreAdapter.setItem('sb-session', largeValue)
      const result = await secureStoreAdapter.getItem('sb-session')

      expect(result).toBe(largeValue)
    })

    it('removeItem deletes every chunk plus the manifest key', async () => {
      const store = new Map<string, string>()
      jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
        store.set(key, value)
      })
      jest
        .mocked(SecureStore.getItemAsync)
        .mockImplementation(async (key) => store.get(key) ?? null)
      jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
        store.delete(key)
      })

      await secureStoreAdapter.setItem('sb-session', largeValue)
      const expectedChunkCount = Math.ceil(largeValue.length / 1800)

      await secureStoreAdapter.removeItem('sb-session')

      // One delete for the manifest key, one per chunk.
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(expectedChunkCount + 1)
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session')
      for (let i = 0; i < expectedChunkCount; i++) {
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(`sb-session_${i}`)
      }
    })
  })

  describe('F-08/F-10: orphaned chunk cleanup on overwrite', () => {
    // Regression: setItem previously wrote the new value/manifest without
    // ever inspecting what was there before, so a chunked value overwritten
    // by a smaller (or unchunked) one left stale chunk items behind forever.
    function backedStore() {
      const store = new Map<string, string>()
      jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
        store.set(key, value)
      })
      jest
        .mocked(SecureStore.getItemAsync)
        .mockImplementation(async (key) => store.get(key) ?? null)
      jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
        store.delete(key)
      })
      return store
    }

    it('deletes leftover chunks when a chunked value is overwritten by a small (unchunked) one', async () => {
      const store = backedStore()
      const largeValue = 'x'.repeat(4500) // chunks into 3 pieces at CHUNK_SIZE=1800
      await secureStoreAdapter.setItem('sb-session', largeValue)
      const priorChunkCount = Math.ceil(largeValue.length / 1800)
      expect(priorChunkCount).toBe(3)
      jest.mocked(SecureStore.deleteItemAsync).mockClear()

      await secureStoreAdapter.setItem('sb-session', 'short-token')

      for (let i = 0; i < priorChunkCount; i++) {
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(`sb-session_${i}`)
      }
      // The key itself now holds the plain value, not a manifest — nothing
      // still references the old chunks.
      expect(store.get('sb-session')).toBe('short-token')
      expect(store.has('sb-session_0')).toBe(false)
      expect(store.has('sb-session_1')).toBe(false)
      expect(store.has('sb-session_2')).toBe(false)
    })

    it('deletes only the now-unreferenced tail chunks when a chunked value shrinks to fewer chunks', async () => {
      const store = backedStore()
      const largeValue = 'x'.repeat(4500) // 3 chunks
      await secureStoreAdapter.setItem('sb-session', largeValue)
      jest.mocked(SecureStore.deleteItemAsync).mockClear()

      const smallerChunkedValue = 'y'.repeat(2000) // 2 chunks
      await secureStoreAdapter.setItem('sb-session', smallerChunkedValue)

      // Chunk 2 is orphaned (only indices 0,1 are referenced by the new manifest).
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session_2')
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1)
      expect(store.has('sb-session_2')).toBe(false)

      const result = await secureStoreAdapter.getItem('sb-session')
      expect(result).toBe(smallerChunkedValue)
    })

    it('does not attempt cleanup when overwriting a value that was never chunked', async () => {
      backedStore()
      await secureStoreAdapter.setItem('sb-session', 'first-short-value')
      jest.mocked(SecureStore.deleteItemAsync).mockClear()

      await secureStoreAdapter.setItem('sb-session', 'second-short-value')

      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled()
    })
  })
})
