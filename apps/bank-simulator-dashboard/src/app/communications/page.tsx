import { resolveEmailMode } from '@/server/email/gateway'
import { listEmailOutbox } from '@/server/repositories/demo-email-outbox-repository'

export const dynamic = 'force-dynamic'

const MODE_LABEL: Record<string, string> = {
  disabled: 'Sending disabled — no network call is ever made',
  'dev-sink': 'Development sink — renders and marks sent, no real network call',
  gmail: 'Gmail SMTP — real sends to allowlisted recipients only',
}

const STATUS_CLASS: Record<string, string> = {
  sent: 'ready',
  queued: 'ready',
  preview: 'ready',
  failed: 'missing',
  suppressed: 'missing',
  'sending-disabled': 'missing',
}

export default async function CommunicationsPage() {
  const mode = resolveEmailMode()
  const outboxResult = await listEmailOutbox()

  return (
    <div>
      <h1 className="page-title">Communications</h1>
      <p className="page-subtitle">
        Demo email outbox — every row's recipient is masked and hashed, never stored in full.
      </p>

      <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <strong>Current email mode:</strong> {MODE_LABEL[mode]}
      </div>

      {!outboxResult.ok ? (
        <div className="card">
          <p>Could not load allowlisted data. Check Demo Settings for configuration state.</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          {outboxResult.value.length === 0 ? (
            <p>No emails queued yet — publish a rate campaign with notifications enabled.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'start' }}>
                  <th style={{ padding: 4 }}>Recipient</th>
                  <th style={{ padding: 4 }}>Locale</th>
                  <th style={{ padding: 4 }}>Template</th>
                  <th style={{ padding: 4 }}>Status</th>
                  <th style={{ padding: 4 }}>Created</th>
                  <th style={{ padding: 4 }}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {outboxResult.value.map((row) => (
                  <tr key={row.id} style={{ borderBlockStart: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 4 }}>{row.recipientMasked}</td>
                    <td style={{ padding: 4 }}>{row.locale.toUpperCase()}</td>
                    <td style={{ padding: 4 }}>{row.templateId}</td>
                    <td style={{ padding: 4 }}>
                      <span
                        className={`status-pill status-pill--${STATUS_CLASS[row.status] ?? 'missing'}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: 4 }}>{row.createdAt.slice(0, 16).replace('T', ' ')}</td>
                    <td style={{ padding: 4 }}>
                      {row.sentAt?.slice(0, 16).replace('T', ' ') ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
