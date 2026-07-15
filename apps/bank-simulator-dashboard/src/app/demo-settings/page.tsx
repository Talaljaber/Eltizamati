import { loadDashboardConfigStatus } from '@/server/config-status'

/**
 * Demo Settings (docs/dashboard.md §15). Shows configuration STATE only —
 * booleans and enums, never secret values. The four action buttons are
 * wired to their real server actions as later phases build the underlying
 * features (seed data / reset in Phase 2, email preview/test-send in
 * Phase 4) — shown disabled with an explicit "not yet available" reason
 * rather than as fake handlers, so this page never claims to do something
 * it can't yet do.
 */
export default function DemoSettingsPage() {
  const status = loadDashboardConfigStatus()

  const rows: readonly { label: string; value: boolean | string }[] = [
    { label: 'Demo dashboard enabled', value: status.demoDashboardEnabled },
    { label: 'Supabase configured', value: status.supabaseConfigured },
    { label: 'Supabase secret configured', value: status.supabaseSecretConfigured },
    { label: 'Gmail SMTP configured', value: status.gmailSmtpConfigured },
    { label: 'Email sending enabled', value: status.emailSendingEnabled },
    { label: 'Recipient allowlist configured', value: status.recipientAllowlistConfigured },
    { label: 'Allowed test users configured', value: status.allowedTestUsersConfigured },
    { label: 'Environment', value: status.environment },
    { label: 'Remote deployment allowed', value: status.remoteDeploymentAllowed },
  ]

  return (
    <div>
      <h1 className="page-title">Demo Settings</h1>
      <p className="page-subtitle">
        Configuration state only — no secret values are ever shown here.
      </p>

      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} style={{ borderBlockEnd: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px 0', color: 'var(--color-text-secondary)' }}>
                  {row.label}
                </td>
                <td style={{ padding: '8px 0', textAlign: 'end' }}>
                  {typeof row.value === 'boolean' ? (
                    <span className={`status-pill status-pill--${row.value ? 'ready' : 'missing'}`}>
                      {row.value ? 'yes' : 'no'}
                    </span>
                  ) : (
                    row.value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBlockStart: 0 }}>Actions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <ActionButtonPlaceholder label="Preview sample email" availableIn="Phase 4" />
          <ActionButtonPlaceholder
            label="Send test email to allowlisted address"
            availableIn="Phase 4"
          />
          <ActionButtonPlaceholder
            label="Reset synthetic demonstration records"
            availableIn="Phase 2"
          />
          <ActionButtonPlaceholder label="Seed demonstration data" availableIn="Phase 2" />
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
