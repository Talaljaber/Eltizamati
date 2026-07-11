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

  it('setItem delegates to SecureStore.setItemAsync with key and value', async () => {
    jest.mocked(SecureStore.setItemAsync).mockResolvedValueOnce(undefined)

    await secureStoreAdapter.setItem('sb-session', 'token-value')

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sb-session', 'token-value')
  })

  it('removeItem delegates to SecureStore.deleteItemAsync with the given key', async () => {
    jest.mocked(SecureStore.deleteItemAsync).mockResolvedValueOnce(undefined)

    await secureStoreAdapter.removeItem('sb-session')

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session')
  })
})
