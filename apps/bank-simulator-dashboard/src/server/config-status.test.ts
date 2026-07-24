import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadDashboardConfigStatus } from './config-status'

const KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'OPERATOR_DECRYPT_TOKEN',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_APP_PASSWORD',
  'EMAIL_SENDING_ENABLED',
  'DEMO_DASHBOARD_ALLOW_REMOTE',
  'DEMO_DASHBOARD_ENABLED',
] as const

describe('loadDashboardConfigStatus', () => {
  afterEach(() => {
    for (const key of KEYS) Reflect.deleteProperty(process.env, key)
    vi.unstubAllEnvs()
  })

  it('reports everything unset as false, never throwing', () => {
    const status = loadDashboardConfigStatus()
    expect(status.supabaseConfigured).toBe(false)
    expect(status.supabaseSecretConfigured).toBe(false)
    expect(status.fieldDecryptionConfigured).toBe(false)
    expect(status.gmailSmtpConfigured).toBe(false)
    expect(status.emailSendingEnabled).toBe(false)
    expect(status.remoteDeploymentAllowed).toBe(false)
    expect(status.demoDashboardEnabled).toBe(false)
    expect(status.environment).toBe('local')
  })

  it('reports Gmail SMTP configured only when all three fields are set', () => {
    process.env.SMTP_HOST = 'smtp.gmail.com'
    process.env.SMTP_USER = 'demo@gmail.com'
    expect(loadDashboardConfigStatus().gmailSmtpConfigured).toBe(false)
    process.env.SMTP_APP_PASSWORD = 'secret'
    expect(loadDashboardConfigStatus().gmailSmtpConfigured).toBe(true)
  })

  it('reports field decryption configured only when OPERATOR_DECRYPT_TOKEN is set', () => {
    expect(loadDashboardConfigStatus().fieldDecryptionConfigured).toBe(false)
    process.env.OPERATOR_DECRYPT_TOKEN = 'operator-token'
    expect(loadDashboardConfigStatus().fieldDecryptionConfigured).toBe(true)
  })

  it('never exposes the actual secret value, only booleans', () => {
    process.env.SUPABASE_SECRET_KEY = 'super-secret-value'
    const status = loadDashboardConfigStatus()
    expect(JSON.stringify(status)).not.toContain('super-secret-value')
  })

  it('reports environment=demo under NODE_ENV=production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(loadDashboardConfigStatus().environment).toBe('demo')
  })
})
