import Link from 'next/link'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { maskClientName } from '@/server/masking'
import { resolveEmailMode } from '@/server/email/gateway'
import { sendCustomEmailAction } from './actions'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

const RESULT_MESSAGE: Record<string, string> = {
  sent: 'Message sent.',
  queued: 'Message queued.',
  preview: 'Message recorded as a preview (sending is disabled or not fully configured).',
  suppressed: 'Message suppressed — that client has not consented to receive emails.',
  'sending-disabled': 'Message recorded, but email sending is currently disabled.',
  failed: 'Message failed to send. Check Demo Settings and try again.',
  noEmailOnFile: 'That client has no email on file — nothing was sent.',
}

export default async function ComposeMessagePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const sentParam = resolvedSearchParams.sent
  const sent = typeof sentParam === 'string' ? sentParam : undefined

  const mode = resolveEmailMode()
  const profilesResult = await listAllowlistedProfiles()

  return (
    <div>
      <p style={{ marginBlockEnd: 'var(--space-3)' }}>
        <Link href="/communications">← Back to Communications</Link>
      </p>
      <h1 className="page-title">Compose message</h1>
      <p className="page-subtitle">
        Send a one-off message to a single client. Still subject to the recipient's consent and
        the current email mode — this only ever reaches the address on file for the selected
        account, regardless of what is typed below.
      </p>

      <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <strong>Current email mode:</strong> {mode}
      </div>

      {sent !== undefined && (
        <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
          {RESULT_MESSAGE[sent] ?? sent}
        </div>
      )}

      {!profilesResult.ok ? (
        <div className="card">
          <p>Could not load data. Check Demo Settings for configuration state.</p>
        </div>
      ) : (
        <form action={sendCustomEmailAction} className="card">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              maxInlineSize: 480,
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
              Client
              <select
                name="userId"
                required
                style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
              >
                {profilesResult.value.map((profile) => (
                  <option key={profile.userId} value={profile.userId} disabled={profile.email === undefined}>
                    {maskClientName(profile.fullName, profile.userId)}
                    {profile.email === undefined ? ' — no email on file' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
              Language
              <select
                name="locale"
                defaultValue="en"
                style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
              Subject
              <input
                type="text"
                name="subject"
                required
                maxLength={200}
                style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
              Message
              <textarea
                name="body"
                required
                rows={8}
                maxLength={5000}
                style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
              />
            </label>

            <p style={{ fontSize: 12, opacity: 0.7 }}>
              Every message automatically ends with the demo disclaimer ("hackathon simulation, not
              an official notification from your bank") — this cannot be removed.
            </p>

            <button type="submit" className="button-primary">
              Send message
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
