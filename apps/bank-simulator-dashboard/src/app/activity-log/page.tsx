import { listRecentActivity } from '@/server/repositories/demo-activity-repository'

export const dynamic = 'force-dynamic'

const EVENT_LABEL: Record<string, string> = {
  campaign_created: 'Campaign created',
  campaign_previewed: 'Campaign previewed',
  rate_period_appended: 'Rate period appended',
  calculation_evaluated: 'Calculation evaluated',
  insight_generated: 'Insight generated',
  email_queued: 'Email queued',
  email_sent: 'Email sent',
  email_suppressed: 'Email suppressed',
  operation_failed: 'Operation failed',
}

export default async function ActivityLogPage() {
  const activityResult = await listRecentActivity()

  return (
    <div>
      <h1 className="page-title">Demo activity log</h1>
      <p className="page-subtitle">
        Append-only. No PII, balances, email addresses, tokens, or secrets are ever recorded here —
        this is not a production compliance audit system.
      </p>

      {!activityResult.ok ? (
        <div className="card">
          <p>Could not load allowlisted data. Check Demo Settings for configuration state.</p>
        </div>
      ) : activityResult.value.length === 0 ? (
        <div className="card">
          <p>No activity recorded yet.</p>
        </div>
      ) : (
        <div className="card">
          <ul style={{ margin: 0, paddingInlineStart: 18, listStyle: 'none' }}>
            {activityResult.value.map((event) => (
              <li
                key={event.id}
                style={{
                  padding: '8px 0',
                  borderBlockStart: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span>
                  <strong>{EVENT_LABEL[event.eventType] ?? event.eventType}</strong> —{' '}
                  {event.summary}
                </span>
                <span
                  className="figure"
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {event.createdAt.slice(0, 16).replace('T', ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
