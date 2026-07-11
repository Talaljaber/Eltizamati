import { isOk, isErr } from '@eltizamati/domain'
import { loadSupabaseEnv } from '../env'

describe('loadSupabaseEnv', () => {
  it('returns ok with the parsed url/anonKey when both are valid', () => {
    const result = loadSupabaseEnv({ url: 'http://127.0.0.1:54321', anonKey: 'test-anon-key' })

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({
        url: 'http://127.0.0.1:54321',
        anonKey: 'test-anon-key',
      })
    }
  })

  it('returns an unexpected AppError when the url is missing', () => {
    const result = loadSupabaseEnv({ url: undefined, anonKey: 'test-anon-key' })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('unexpected')
    }
  })

  it('returns an unexpected AppError when the url is not a valid URL', () => {
    const result = loadSupabaseEnv({ url: 'not-a-url', anonKey: 'test-anon-key' })

    expect(isErr(result)).toBe(true)
  })

  it('returns an unexpected AppError when the anon key is missing', () => {
    const result = loadSupabaseEnv({ url: 'http://127.0.0.1:54321', anonKey: undefined })

    expect(isErr(result)).toBe(true)
  })
})
