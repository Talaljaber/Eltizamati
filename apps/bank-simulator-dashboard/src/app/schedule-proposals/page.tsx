import Link from 'next/link'
import { listAllowlistedScheduleProposals } from '@/server/repositories/schedule-proposal-repository'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { maskClientName } from '@/server/masking'
import { Th, Td, TableScroll } from '@/components/table'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  superseded: 'Superseded',
}

/**
 * The one place that answers "which loans have a schedule proposal waiting on
 * us" across the whole portfolio — previously only discoverable by opening
 * each client's own detail page and scrolling to the right obligation.
 * Deciding still happens on the client page itself (the existing accept/
 * reject form there is the single source of truth for that action); this
 * page's job is purely to point you at the right one.
 */
export default async function ScheduleProposalsPage() {
  const [proposalsResult, obligationsResult, profilesResult] = await Promise.all([
    listAllowlistedScheduleProposals(),
    listAllowlistedObligations(),
    listAllowlistedProfiles(),
  ])

  if (!proposalsResult.ok) {
    return (
      <div>
        <h1 className="page-title">Schedule proposals</h1>
        <div className="card">
          <p>Could not load data. Check Demo Settings for configuration state.</p>
        </div>
      </div>
    )
  }

  const obligations = obligationsResult.ok ? obligationsResult.value : []
  const profiles = profilesResult.ok ? profilesResult.value : []
  const nicknameByObligation = new Map<string, string>(
    obligations.map((o) => [o.id, o.nickname]),
  )
  const institutionByObligation = new Map<string, string>(
    obligations.map((o) => [o.id, o.institution.name]),
  )
  const nameByUser = new Map<string, string>(
    profiles.map((p) => [p.userId, maskClientName(p.fullName, p.userId)]),
  )

  const pending = proposalsResult.value
    .filter((p) => p.status === 'pending')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const decided = proposalsResult.value
    .filter((p) => p.status !== 'pending')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 50)

  return (
    <div>
      <h1 className="page-title">Schedule proposals</h1>
      <p className="page-subtitle">
        Every customer-submitted recommended/custom schedule across the portfolio, newest first.
        Deciding a proposal (accept as the agreed schedule, or reject it) happens on the client's
        own page — use &quot;Open &amp; decide&quot; to jump straight to it.
      </p>

      <h2 className="section-title">Awaiting review ({pending.length})</h2>
      {pending.length === 0 ? (
        <div className="card">
          <p>No schedule proposals are waiting on a decision.</p>
        </div>
      ) : (
        <div className="card" style={{ marginBlockEnd: 'var(--space-6)' }}>
          <TableScroll>
            <table className="table">
              <thead>
                <tr>
                  <Th>Client</Th>
                  <Th>Loan</Th>
                  <Th>Institution</Th>
                  <Th>Kind</Th>
                  <Th>Proposed installment</Th>
                  <Th>Submitted</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {pending.map((proposal) => (
                  <tr key={proposal.id}>
                    <Td>{nameByUser.get(proposal.user_id) ?? 'Client'}</Td>
                    <Td>{nicknameByObligation.get(proposal.obligation_id) ?? '—'}</Td>
                    <Td>{institutionByObligation.get(proposal.obligation_id) ?? '—'}</Td>
                    <Td>{proposal.proposal_kind}</Td>
                    <Td className="figure">
                      {proposal.proposed_installment} {proposal.currency}
                    </Td>
                    <Td>{proposal.created_at.slice(0, 10)}</Td>
                    <Td>
                      <Link
                        href={`/clients/${proposal.user_id}#obligation-${proposal.obligation_id}`}
                        className="button button--primary"
                      >
                        Open &amp; decide
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
      )}

      <h2 className="section-title">Recently decided</h2>
      {decided.length === 0 ? (
        <div className="card">
          <p>No decided proposals yet.</p>
        </div>
      ) : (
        <div className="card">
          <TableScroll>
            <table className="table">
              <thead>
                <tr>
                  <Th>Client</Th>
                  <Th>Loan</Th>
                  <Th>Status</Th>
                  <Th>Decided</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {decided.map((proposal) => (
                  <tr key={proposal.id}>
                    <Td>{nameByUser.get(proposal.user_id) ?? 'Client'}</Td>
                    <Td>{nicknameByObligation.get(proposal.obligation_id) ?? '—'}</Td>
                    <Td>
                      <span
                        className={`status-pill status-pill--${proposal.status === 'approved' ? 'ready' : 'missing'}`}
                      >
                        {STATUS_LABEL[proposal.status] ?? proposal.status}
                      </span>
                    </Td>
                    <Td>{proposal.decided_at?.slice(0, 10) ?? '—'}</Td>
                    <Td>{proposal.decision_reason ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
      )}
    </div>
  )
}
