import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AUTH_CALLBACK_BASE_URL } from '../supabase-auth-service'

describe('auth callback configuration', () => {
  it('keeps the app callback aligned with the local Supabase redirect allowlist', () => {
    const config = readFileSync(
      resolve(__dirname, '../../../../../../supabase/config.toml'),
      'utf8',
    )
    expect(AUTH_CALLBACK_BASE_URL).toBe('eltizamati://auth/callback')
    expect(config).toContain(`"${AUTH_CALLBACK_BASE_URL}"`)
  })
})
