import { loadDashboardConfigStatus } from '@/server/config-status'
import { renderRateChangeEmail } from '@/server/email/templates'
import { resolveEmailMode } from '@/server/email/gateway'
import { Th, Td } from '@/components/table'

const SAMPLE_EMAIL_PARAMS = {
  obligationNickname: 'Demo loan',
  oldRatePercent: '7.500',
  newRatePercent: '9.250',
  effectiveDate: '2026-08-01',
  projectedResidualAmount: '1234.560',
  currency: 'JOD',
}

/**
 * resolveEmailMode() reads getDashboardEnv(), which throws on an
 * incomplete config — this page's whole job is to stay renderable even
 * when config is incomplete (that's exactly when an operator needs it), so
 * a config-invariant failure here degrades to "unknown", not a crash.
 */
function resolveEmailModeSafely(): 'disabled' | 'dev-sink' | 'gmail' | 'unknown' {
  try {
    return resolveEmailMode()
  } catch {
    return 'unknown'
  }
}

/**
 * Demo Settings (docs/dashboard.md §15). Shows configuration STATE only —
 * booleans and enums, never secret values. Preview-sample-email is a real,
 * read-only render (safe — no network call). Send-test-email, reset, and
 * seed are destructive or require live credentials this pass doesn't wire
 * up, so they stay explicit placeholders rather than fake handlers.
 */
export default function DemoSettingsPage() {
  const status = loadDashboardConfigStatus()
  const emailMode = resolveEmailModeSafely()
  const sampleEnglish = renderRateChangeEmail('en', SAMPLE_EMAIL_PARAMS)
  const sampleArabic = renderRateChangeEmail('ar', SAMPLE_EMAIL_PARAMS)

  const rows: readonly { label: string; value: boolean | string }[] = [
    { label: 'Demo dashboard enabled', value: status.demoDashboardEnabled },
    { label: 'Supabase configured', value: status.supabaseConfigured },
    { label: 'Supabase secret configured', value: status.supabaseSecretConfigured },
    { label: 'Gmail SMTP configured', value: status.gmailSmtpConfigured },
    { label: 'Email sending enabled', value: status.emailSendingEnabled },
    { label: 'Recipient gating', value: 'Per-recipient consent (no allowlist)' },
    { label: 'Environment', value: status.environment },
    { label: 'Remote deployment allowed', value: status.remoteDeploymentAllowed },
  ]

  return (
    <div>
      <h1 className="page-title">Demo Settings</h1>
      <p className="page-subtitle">
        Configuration state only — no secret values are ever shown here.
      </p>

      <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <table className="table">
          <thead>
            <tr>
              <Th>Setting</Th>
              <Th align="end">Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <Td>{row.label}</Td>
                <Td align="end">
                  {typeof row.value === 'boolean' ? (
                    <span className={`status-pill status-pill--${row.value ? 'ready' : 'missing'}`}>
                      {row.value ? 'yes' : 'no'}
                    </span>
                  ) : (
                    row.value
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 16, marginBlockStart: 0 }}>Current email mode</h2>
        <p style={{ fontSize: 13 }}>
          <span className="status-pill status-pill--ready">{emailMode}</span> — derived from
          configuration, never a manual toggle.
        </p>
      </div>

      <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 16, marginBlockStart: 0 }}>Preview sample email</h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Read-only render with sample data — no network call, nothing is sent or persisted.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>English — {sampleEnglish.subject}</div>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 12,
                background: 'var(--color-surface)',
                padding: 8,
              }}
            >
              {sampleEnglish.text}
            </pre>
          </div>
          <div dir="rtl">
            <div style={{ fontSize: 12, fontWeight: 600 }}>عربي — {sampleArabic.subject}</div>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 12,
                background: 'var(--color-surface)',
                padding: 8,
              }}
            >
              {sampleArabic.text}
            </pre>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBlockStart: 0 }}>Other actions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <ActionButtonPlaceholder
            label="Send test email to allowlisted address"
            availableIn="a future pass — requires explicit owner confirmation and a real Gmail configuration"
          />
          <ActionButtonPlaceholder
            label="Reset synthetic demonstration records"
            availableIn="a future pass"
          />
          <ActionButtonPlaceholder label="Seed demonstration data" availableIn="a future pass" />
        </div>
      </div>
    </div>
  )
}

function ActionButtonPlaceholder({ label, availableIn }: { label: string; availableIn: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <button
        className="button-secondary"
        disabled
        aria-disabled="true"
        title={`Available in ${availableIn}`}
      >
        {label}
      </button>
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
        Available in {availableIn}
      </span>
    </div>
  )
}
