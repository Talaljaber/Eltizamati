import Link from 'next/link'
import { isUserAllowlisted } from '@/server/allowlist'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listAllowlistedPayments } from '@/server/repositories/payment-repository'
import { listAllowlistedInsights } from '@/server/repositories/insight-repository'
import { listAllowlistedCalculationRuns } from '@/server/repositories/calculation-run-repository'
import { maskClientName } from '@/server/masking'
import { formatMoney } from '@/format/money'
import { SourcedMoneyValue, SourcedRateValue } from '@/components/sourced-amount'
import { ProvenanceBadge } from '@/components/provenance-badge'
import type {
  ConventionalLoan,
  CreditCard,
  MurabahaFinancing,
  Obligation,
} from '@eltizamati/domain'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  if (!isUserAllowlisted(userId)) {
    return (
      <div>
        <h1 className="page-title">Client not available</h1>
        <div className="card">
          <p>This client is not on the demo allowlist.</p>
        </div>
      </div>
    )
  }

  const [profilesResult, obligationsResult, insightsResult, calcRunsResult] = await Promise.all([
    listAllowlistedProfiles(),
    listAllowlistedObligations(),
    listAllowlistedInsights(),
    listAllowlistedCalculationRuns(),
  ])

  if (!profilesResult.ok || !obligationsResult.ok || !insightsResult.ok || !calcRunsResult.ok) {
    return (
      <div>
        <h1 className="page-title">Client detail</h1>
        <div className="card">
          <p>Could not load allowlisted data. Check Demo Settings for configuration state.</p>
        </div>
      </div>
    )
  }

  const profile = profilesResult.value.find((p) => p.userId === userId)
  const obligations = obligationsResult.value.filter((o) => o.userId === userId)
  const insights = insightsResult.value.filter((i) => i.userId === userId)
  const calcRuns = calcRunsResult.value.filter((r) => r.userId === userId)

  const paymentsResult = await listAllowlistedPayments(obligationsResult.value)
  const payments = paymentsResult.ok ? paymentsResult.value.filter((p) => p.userId === userId) : []

  if (profile === undefined) {
    return (
      <div>
        <h1 className="page-title">Client not found</h1>
        <div className="card">
          <p>No profile row exists for this allowlisted user id.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">{maskClientName(profile.fullName, profile.userId)}</h1>
      <p className="page-subtitle">
        <Link href="/clients">← Back to clients</Link>
      </p>

      <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 16, marginBlockStart: 0 }}>Profile</h2>
        <dl
          style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', margin: 0 }}
        >
          <dt style={{ color: 'var(--color-text-secondary)' }}>Language</dt>
          <dd>{profile.locale.toUpperCase()}</dd>
          <dt style={{ color: 'var(--color-text-secondary)' }}>Primary bank</dt>
          <dd>{profile.primaryBank ?? '—'}</dd>
          <dt style={{ color: 'var(--color-text-secondary)' }}>Data mode</dt>
          <dd>{profile.dataMode}</dd>
          <dt style={{ color: 'var(--color-text-secondary)' }}>Updated</dt>
          <dd>{profile.updatedAt.slice(0, 10)}</dd>
        </dl>
      </div>

      <h2 style={{ fontSize: 18 }}>Obligations</h2>
      {obligations.length === 0 ? (
        <div className="card">No obligations on file for this client.</div>
      ) : (
        obligations.map((obligation) => (
          <ObligationCard key={obligation.id} obligation={obligation} />
        ))
      )}

      <h2 style={{ fontSize: 18, marginBlockStart: 'var(--space-6)' }}>Payment history</h2>
      <div className="card" style={{ overflowX: 'auto', marginBlockEnd: 'var(--space-6)' }}>
        {payments.length === 0 ? (
          <p>No payments on file.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'start' }}>
                <th style={{ padding: 4 }}>Date</th>
                <th style={{ padding: 4 }}>Amount</th>
                <th style={{ padding: 4 }}>Allocation</th>
              </tr>
            </thead>
            <tbody>
              {payments
                .slice()
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((payment) => (
                  <tr
                    key={payment.id}
                    style={{ borderBlockStart: '1px solid var(--color-border)' }}
                  >
                    <td style={{ padding: 4 }}>{payment.date}</td>
                    <td className="figure" style={{ padding: 4 }}>
                      {formatMoney(payment.amount)}
                    </td>
                    <td style={{ padding: 4 }}>
                      {payment.allocation === undefined
                        ? '—'
                        : `${formatMoney(payment.allocation.principal)} principal / ${formatMoney(payment.allocation.cost)} cost (${payment.allocation.allocationSource})`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ fontSize: 18 }}>Calculations</h2>
      <div className="card" style={{ overflowX: 'auto', marginBlockEnd: 'var(--space-6)' }}>
        {calcRuns.length === 0 ? (
          <p>No calculation runs on file.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'start' }}>
                <th style={{ padding: 4 }}>Formula</th>
                <th style={{ padding: 4 }}>As of</th>
                <th style={{ padding: 4 }}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {calcRuns.map((run) => (
                <tr key={run.id} style={{ borderBlockStart: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 4 }}>
                    {run.formulaId} v{run.formulaVersion}
                  </td>
                  <td style={{ padding: 4 }}>{run.asOf}</td>
                  <td style={{ padding: 4 }}>
                    {run.outcome.kind === 'result' ? (
                      <span className="status-pill status-pill--ready">
                        result ({run.outcome.confidence})
                      </span>
                    ) : (
                      <span className="status-pill status-pill--missing">
                        refused ({run.outcome.missingFields.join(', ')})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ fontSize: 18 }}>Insights</h2>
      <div className="card">
        {insights.length === 0 ? (
          <p>No insights on file.</p>
        ) : (
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {insights.map((insight) => (
              <li key={insight.id} style={{ marginBlockEnd: 4 }}>
                <strong>{insight.ruleId}</strong> — severity: {insight.severity}
                {insight.readAt === undefined ? ' (unread)' : ' (read)'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ObligationCard({ obligation }: { obligation: Obligation }) {
  return (
    <div className="card" style={{ marginBlockEnd: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>{obligation.nickname}</h3>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {obligation.kind} · {obligation.institution.name}
          {obligation.closedDate !== undefined ? ' · closed' : ''}
        </span>
      </div>
      <div style={{ marginBlockStart: 8 }}>
        <ProvenanceBadge source={obligation.provenance.source} />
        {obligation.kind === 'conventionalLoan' ? <LoanFields loan={obligation} /> : null}
        {obligation.kind === 'murabaha' ? <MurabahaFields murabaha={obligation} /> : null}
        {obligation.kind === 'creditCard' ? <CardFields card={obligation} /> : null}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13 }}>{children}</span>
    </div>
  )
}

function LoanFields({ loan }: { loan: ConventionalLoan }) {
  const { loanDetails } = loan
  const activeRate = [...loanDetails.ratePeriods]
    .filter((p) => p.supersededBy === undefined)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]

  return (
    <div>
      <Field label="Original principal">
        <SourcedMoneyValue sourced={loanDetails.originalPrincipal} />
      </Field>
      <Field label="Outstanding balance">
        <SourcedMoneyValue sourced={loanDetails.outstandingBalance} />
      </Field>
      <Field label="Installment">
        <SourcedMoneyValue sourced={loanDetails.installment} />
      </Field>
      <Field label="Rate type">{loanDetails.rateType}</Field>
      <Field label="Current rate">
        {activeRate !== undefined ? (
          <span className="figure">
            {activeRate.annualRate.toPercent().toFixed(3)}%
            <ProvenanceBadge source={activeRate.provenance.source} />
          </span>
        ) : (
          'Unknown'
        )}
      </Field>
      <Field label="Maturity date">{loanDetails.maturityDate}</Field>
      <Field label="Contractual balloon">
        <SourcedMoneyValue sourced={loanDetails.contractualBalloon} />
      </Field>
      <details style={{ marginBlockStart: 8 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Rate history ({loanDetails.ratePeriods.length})
        </summary>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBlockStart: 4 }}>
          <thead>
            <tr style={{ textAlign: 'start' }}>
              <th style={{ padding: 4 }}>Effective from</th>
              <th style={{ padding: 4 }}>Rate</th>
              <th style={{ padding: 4 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...loanDetails.ratePeriods]
              .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1))
              .map((period) => (
                <tr key={period.id} style={{ borderBlockStart: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 4 }}>{period.effectiveFrom}</td>
                  <td className="figure" style={{ padding: 4 }}>
                    {period.annualRate.toPercent().toFixed(3)}%
                  </td>
                  <td style={{ padding: 4 }}>
                    {period.supersededBy === undefined ? 'Active' : 'Superseded'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function MurabahaFields({ murabaha }: { murabaha: MurabahaFinancing }) {
  const { murabahaDetails } = murabaha
  return (
    <div>
      <Field label="Asset cost">
        <SourcedMoneyValue sourced={murabahaDetails.assetCost} />
      </Field>
      <Field label="Disclosed profit">
        <SourcedMoneyValue sourced={murabahaDetails.disclosedProfit} />
      </Field>
      <Field label="Total sale price">
        <SourcedMoneyValue sourced={murabahaDetails.totalSalePrice} />
      </Field>
      <Field label="Installment">
        <SourcedMoneyValue sourced={murabahaDetails.installment} />
      </Field>
    </div>
  )
}

function CardFields({ card }: { card: CreditCard }) {
  const { cardDetails } = card
  return (
    <div>
      <Field label="Credit limit">
        <SourcedMoneyValue sourced={cardDetails.creditLimit} />
      </Field>
      <Field label="Current balance">
        <SourcedMoneyValue sourced={cardDetails.currentBalance} />
      </Field>
      <Field label="Purchase APR">
        <SourcedRateValue sourced={cardDetails.purchaseApr} />
      </Field>
      <Field label="Due date">{cardDetails.dueDate ?? '—'}</Field>
    </div>
  )
}
