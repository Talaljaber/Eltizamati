import { describe, expect, it } from 'vitest'
import { loadDashboardEnv, type RawDashboardEnv } from './env'

const validRaw: RawDashboardEnv = {
  nodeEnv: 'development',
  demoDashboardEnabled: 'true',
  demoDashboardAllowRemote: 'false',
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseSecretKey: 'service-role-secret',
  operatorDecryptToken: undefined,
  emailSendingEnabled: 'false',
  smtpHost: 'smtp.gmail.com',
  smtpPort: '587',
  smtpUser: 'demo@gmail.com',
  smtpAppPassword: 'app-password',
  smtpSenderName: 'Eltizamati Demo',
  smtpSenderEmail: 'demo@gmail.com',
}

describe('loadDashboardEnv', () => {
  it('accepts a fully valid local configuration', () => {
    const result = loadDashboardEnv(validRaw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.environment).toBe('local')
      expect(result.value.smtpPort).toBe(587)
    }
  })

  it('refuses when DEMO_DASHBOARD_ENABLED is not true', () => {
    const result = loadDashboardEnv({ ...validRaw, demoDashboardEnabled: 'false' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
  })

  it('refuses a production deployment without an explicit remote-allow flag', () => {
    const result = loadDashboardEnv({
      ...validRaw,
      nodeEnv: 'production',
      demoDashboardAllowRemote: 'false',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('authorization')
      expect(result.error.safeMetadata?.reason).toBe('productionDeploymentWithoutRemoteAllow')
    }
  })

  it('allows a production deployment when remote is explicitly allowed', () => {
    const result = loadDashboardEnv({
      ...validRaw,
      nodeEnv: 'production',
      demoDashboardAllowRemote: 'true',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.environment).toBe('demo')
  })

  it('rejects an invalid Supabase URL', () => {
    const result = loadDashboardEnv({ ...validRaw, supabaseUrl: 'not-a-url' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('validation')
  })

  it('rejects a missing Supabase secret key', () => {
    const result = loadDashboardEnv({ ...validRaw, supabaseSecretKey: '' })
    expect(result.ok).toBe(false)
  })

  it('defaults emailSendingEnabled and demoDashboardAllowRemote to false when unset', () => {
    const result = loadDashboardEnv({
      ...validRaw,
      emailSendingEnabled: undefined,
      demoDashboardAllowRemote: undefined,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.emailSendingEnabled).toBe(false)
      expect(result.value.demoDashboardAllowRemote).toBe(false)
    }
  })
})
