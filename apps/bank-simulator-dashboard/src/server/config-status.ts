/**
 * Non-throwing configuration status for the Demo Settings page
 * (docs/dashboard.md §15: "Show configuration state without exposing
 * values"). Deliberately separate from `getDashboardEnv()`, which throws on
 * an invalid/incomplete environment — that's correct for code paths that
 * need a fully working config to do anything useful (Supabase queries,
 * email sending), but wrong for the one page whose job is to show an
 * operator exactly what's missing. This module never throws and never
 * returns a secret value, only booleans/enums.
 */
function isSet(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0
}

function isTrue(value: string | undefined): boolean {
  return value !== undefined && ['true', '1', 'yes'].includes(value.trim().toLowerCase())
}

export interface DashboardConfigStatus {
  readonly supabaseConfigured: boolean
  readonly supabaseSecretConfigured: boolean
  readonly gmailSmtpConfigured: boolean
  readonly emailSendingEnabled: boolean
  readonly recipientAllowlistConfigured: boolean
  readonly allowedTestUsersConfigured: boolean
  readonly environment: 'local' | 'demo'
  readonly remoteDeploymentAllowed: boolean
  readonly demoDashboardEnabled: boolean
}

export function loadDashboardConfigStatus(): DashboardConfigStatus {
  const nodeEnv = process.env.NODE_ENV
  const environment: 'local' | 'demo' = nodeEnv === 'production' ? 'demo' : 'local'

  return {
    supabaseConfigured: isSet(process.env.SUPABASE_URL),
    supabaseSecretConfigured: isSet(process.env.SUPABASE_SECRET_KEY),
    gmailSmtpConfigured:
      isSet(process.env.SMTP_HOST) &&
      isSet(process.env.SMTP_USER) &&
      isSet(process.env.SMTP_APP_PASSWORD),
    emailSendingEnabled: isTrue(process.env.EMAIL_SENDING_ENABLED),
    recipientAllowlistConfigured: isSet(process.env.EMAIL_RECIPIENT_ALLOWLIST),
    allowedTestUsersConfigured: isSet(process.env.DEMO_ALLOWED_USER_IDS),
    environment,
    remoteDeploymentAllowed: isTrue(process.env.DEMO_DASHBOARD_ALLOW_REMOTE),
    demoDashboardEnabled: isTrue(process.env.DEMO_DASHBOARD_ENABLED),
  }
}
