import { toSupabaseAppError } from '../supabase-error'

describe('toSupabaseAppError', () => {
  it.each([
    [{ code: 'PGRST301', message: 'JWT expired' }, 'auth'],
    [{ code: '42501', message: 'permission denied' }, 'authorization'],
    [{ code: '57014', message: 'statement timeout' }, 'providerUnavailable'],
    [{ code: '', message: 'Network request failed' }, 'connectivity'],
    [{ code: '23505', message: 'duplicate key' }, 'storage'],
  ])('classifies %j as %s', (providerError, expectedCode) => {
    expect(toSupabaseAppError(providerError).code).toBe(expectedCode)
  })
})
