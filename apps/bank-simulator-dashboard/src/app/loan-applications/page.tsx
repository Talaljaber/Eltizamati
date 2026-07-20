import { localDateFromDate, Money, resolveMonthlyCommitment } from '@eltizamati/domain'
import { listAllowlistedLoanApplications } from '@/server/repositories/loan-application-repository'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { computeDemoRiskIndicator, type DemoRiskBand } from '@/server/demo-risk-indicator'
import { maskClientName } from '@/server/masking'
import { Th, Td, TableScroll } from '@/components/table'
import { decideLoanApplicationAction } from './actions'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

const CURRENCY = 'JOD'

const DECISION_MESSAGE: Record<string, string> = {
  approved: 'Application approved — a new obligation was created for the client.',
  rejected: 'Application rejected — the client keeps the reason in their app.',
  error: 'The decision could not be completed. Check the details and try again.',
  invalid: 'Enter a positive amount, term, and rate to approve.',
  notFound: 'That application was not found.',
}

const RISK_LABEL: Record<DemoRiskBand, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const PURPOSE_LABEL: Record<string, string> = {
  personal: 'Personal',
  auto: 'Auto',
  housing: 'Housing',
  other: 'Other',
}

export default async function LoanApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolved = await searchParams
  const decided = typeof resolved.decided === 'string' ? resolved.decided : undefined
  const today = localDateFromDate(new Date())

  const [applicationsResult, obligationsResult, profilesResult] = await Promise.all([
    listAllowlistedLoanApplications(),
    listAllowlistedObligations(),
    listAllowlistedProfiles(),
  ])

  if (!applicationsResult.ok) {
    return (
      <div>
        <h1 className="page-title">Loan applications</h1>
        <div className="card">
          <p>Could not load data. Check Demo Settings for configuration state.</p>
        </div>
      </div>
    )
  }

  const obligations = obligationsResult.ok ? obligationsResult.value : []
  const profiles = profilesResult.ok ? profilesResult.value : []

  // Existing known monthly commitment per user (JOD), for the synthetic risk band.
  const commitmentByUser = new Map<string, number>()
  for (const profile of profiles) {
    const own = obligations.filter((o) => o.userId === profile.userId && o.closedDate === undefined)
    let total = Money.zero(CURRENCY)
    for (const o of own) {
      const sourced = resolveMonthlyCommitment(o, today)
      if (sourced !== undefined) total = total.add(sourced.value)
    }
    commitmentByUser.set(profile.userId, Number(total.toStorageString()))
  }

  const nameByUser = new Map<string, string>(
    profiles.map((p) => [p.userId, maskClientName(p.fullName, p.userId)]),
  )

  const pending = applicationsResult.value.filter((a) => a.status === 'pending')
  const decidedApplications = applicationsResult.value.filter((a) => a.status !== 'pending')

  return (
    <div>
      <h1 className="page-title">Loan applications</h1>
      <p className="page-subtitle">
        Review client loan applications. Approving instantly creates a real obligation on the
        client&apos;s account with the terms you set; rejecting keeps a reason the client can see.
      </p>

      {decided !== undefined && (
        <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
          {DECISION_MESSAGE[decided] ?? decided}
        </div>
      )}

      <div className="card" style={{ marginBlockEnd: 'var(--space-5)', fontSize: 13 }}>
        The risk band below is a <strong>synthetic demo indicator</strong> derived only from the
        client&apos;s existing obligations in this system — not a real credit-bureau score. It is a
        glance aid; the decision is yours.
      </div>

      <h2 className="section-title">Pending ({pending.length})</h2>
      {pending.length === 0 ? (
        <div className="card">
          <p>No pending applications.</p>
        </div>
      ) : (
        pending.map((application) => {
          const risk = computeDemoRiskIndicator({
            requestedAmount: application.requestedAmount,
            requestedTermMonths: application.requestedTermMonths,
            existingMonthlyCommitment: commitmentByUser.get(application.userId) ?? 0,
          })
          return (
            <div key={application.id} className="card" style={{ marginBlockEnd: 'var(--space-4)' }}>
              <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>
                {nameByUser.get(application.userId) ?? 'Client'} · {application.institutionName}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {PURPOSE_LABEL[application.purpose] ?? application.purpose} · Requested{' '}
                <span className="figure">{application.requestedAmount}</span> {CURRENCY} over{' '}
                {application.requestedTermMonths} months
              </p>
              <p style={{ fontSize: 13 }}>
                Synthetic risk band:{' '}
                <span className={`status-pill status-pill--${risk.band === 'high' ? 'missing' : 'ready'}`}>
                  {RISK_LABEL[risk.band]}
                </span>{' '}
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  (est. {risk.estimatedMonthlyPayment} {CURRENCY}/mo, {risk.burdenRatio}× existing
                  commitments)
                </span>
              </p>
              {application.applicantNote !== null && (
                <p style={{ fontSize: 13, fontStyle: 'italic' }}>“{application.applicantNote}”</p>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <form action={decideLoanApplicationAction} className="card" style={{ flex: 1, minInlineSize: 280 }}>
                  <h4 style={{ marginBlockStart: 0, fontSize: 14 }}>Approve</h4>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                      Approved amount ({CURRENCY})
                      <input
                        type="number"
                        name="approvedAmount"
                        step="0.001"
                        min="0"
                        defaultValue={application.requestedAmount}
                        required
                        style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                      Term (months)
                      <input
                        type="number"
                        name="approvedTermMonths"
                        min="1"
                        step="1"
                        defaultValue={application.requestedTermMonths}
                        required
                        style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                      Annual rate (%)
                      <input
                        type="number"
                        name="approvedRatePercent"
                        step="0.001"
                        min="0"
                        max="100"
                        required
                        style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                      />
                    </label>
                    <button type="submit" className="button-primary">
                      Approve &amp; create loan
                    </button>
                  </div>
                </form>

                <form action={decideLoanApplicationAction} className="card" style={{ flex: 1, minInlineSize: 280 }}>
                  <h4 style={{ marginBlockStart: 0, fontSize: 14 }}>Reject</h4>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                      Reason (shown to the client)
                      <textarea
                        name="decisionReason"
                        required
                        rows={4}
                        style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                      />
                    </label>
                    <button type="submit" className="button-secondary">
                      Reject application
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        })
      )}

      <h2 className="section-title" style={{ marginBlockStart: 'var(--space-6)' }}>
        Decided ({decidedApplications.length})
      </h2>
      {decidedApplications.length === 0 ? (
        <div className="card">
          <p>No decided applications yet.</p>
        </div>
      ) : (
        <div className="card">
          <TableScroll>
            <table className="table">
              <thead>
                <tr>
                  <Th>Client</Th>
                  <Th>Institution</Th>
                  <Th>Status</Th>
                  <Th>Outcome</Th>
                </tr>
              </thead>
              <tbody>
                {decidedApplications.map((application) => (
                  <tr key={application.id}>
                    <Td>{nameByUser.get(application.userId) ?? 'Client'}</Td>
                    <Td>{application.institutionName}</Td>
                    <Td>
                      <span
                        className={`status-pill status-pill--${application.status === 'approved' ? 'ready' : 'missing'}`}
                      >
                        {application.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </Td>
                    <Td>
                      {application.status === 'approved'
                        ? `${application.approvedAmount ?? '—'} ${CURRENCY} over ${application.approvedTermMonths ?? '—'} months`
                        : (application.decisionReason ?? '—')}
                    </Td>
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
