import Link from 'next/link'
import { resolveEmailMode } from '@/server/email/gateway'
import { listEmailOutbox } from '@/server/repositories/demo-email-outbox-repository'
import { Th, Td, TableScroll } from '@/components/table'

export const dynamic = 'force-dynamic'

const MODE_LABEL: Record<string, string> = {
  disabled: 'Sending disabled — no network call is ever made',
  'dev-sink': 'Development sink — renders and marks sent, no real network call',
  gmail: 'Gmail SMTP — real sends to consenting recipients only',
}

const STATUS_CLASS: Record<string, string> = {
  sent: 'ready',
  queued: 'ready',
  preview: 'ready',
  failed: 'missing',
  suppressed: 'missing',
  'sending-disabled': 'missing',
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Sent',
  queued: 'Queued',
  preview: 'Preview',
  failed: 'Failed',
  suppressed: 'Suppressed',
  'sending-disabled': 'Sending disabled',
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

      <p style={{ marginBlockEnd: 'var(--space-5)' }}>
        <Link
          href="/communications/compose"
          className="button-primary"
          style={{ display: 'inline-block', textDecoration: 'none' }}
        >
          Compose message
        </Link>
      </p>

      {!outboxResult.ok ? (
        <div className="card">
          <p>Could not load data. Check Demo Settings for configuration state.</p>
        </div>
      ) : (
        <div className="card">
          {outboxResult.value.length === 0 ? (
            <p>No emails queued yet — publish a rate campaign with notifications enabled.</p>
          ) : (
            <TableScroll>
              <table className="table">
                <thead>
                  <tr>
                    <Th>Recipient</Th>
                    <Th>Locale</Th>
                    <Th>Template</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th>Sent</Th>
                  </tr>
                </thead>
                <tbody>
                  {outboxResult.value.map((row) => (
                    <tr key={row.id}>
                      <Td>{row.recipientMasked}</Td>
                      <Td>{row.locale.toUpperCase()}</Td>
                      <Td>{row.templateId}</Td>
                      <Td>
                        <span
                          className={`status-pill status-pill--${STATUS_CLASS[row.status] ?? 'missing'}`}
                        >
                          {STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </Td>
                      <Td>{row.createdAt.slice(0, 16).replace('T', ' ')}</Td>
                      <Td>{row.sentAt?.slice(0, 16).replace('T', ' ') ?? '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </div>
      )}
    </div>
  )
}
