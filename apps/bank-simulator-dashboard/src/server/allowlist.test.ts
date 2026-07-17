import { afterEach, describe, expect, it } from 'vitest'
import { resetDashboardEnvCacheForTests } from './env'
import { assertAllowlistConfigured, isUserAllowlisted } from './allowlist'

const requiredEnv = {
  DEMO_DASHBOARD_ENABLED: 'true',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SECRET_KEY: 'service-role-secret',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SENDER_NAME: 'Eltizamati Demo',
}

function setProcessEnv(overrides: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries({ ...requiredEnv, ...overrides })) {
    if (value === undefined) Reflect.deleteProperty(process.env, key)
    else process.env[key] = value
  }
}

describe('allowlist gate', () => {
  afterEach(() => {
    resetDashboardEnvCacheForTests()
    for (const key of [...Object.keys(requiredEnv), 'DEMO_ALLOWED_USER_IDS', 'DEMO_ALLOWED_EMAILS']) {
      Reflect.deleteProperty(process.env, key)
    }
  })

  it('refuses to load client-level data when the allowlist is empty', () => {
    setProcessEnv({ DEMO_ALLOWED_USER_IDS: undefined })
    expect(() => assertAllowlistConfigured()).toThrow(/DEMO_ALLOWED_USER_IDS is empty/)
  })

  it('returns the allowlisted ids when configured', () => {
    setProcessEnv({ DEMO_ALLOWED_USER_IDS: 'user-1,user-2' })
    expect(assertAllowlistConfigured()).toEqual(['user-1', 'user-2'])
  })

  it('checks user-id membership', () => {
    setProcessEnv({ DEMO_ALLOWED_USER_IDS: 'user-1,user-2' })
    expect(isUserAllowlisted('user-1')).toBe(true)
    expect(isUserAllowlisted('user-3')).toBe(false)
  })
})
