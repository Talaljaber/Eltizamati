import Link from 'next/link'
import { isUserAllowlisted } from '@/server/allowlist'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listAllowlistedPayments } from '@/server/repositories/payment-repository'
import { listAllowlistedInsights } from '@/server/repositories/insight-repository'
import { listAllowlistedCalculationRuns } from '@/server/repositories/calculation-run-repository'
import {
  listAllowlistedScheduleProposals,
  type ScheduleProposalRow,
} from '@/server/repositories/schedule-proposal-repository'
import { decideScheduleProposalAction } from './schedule-proposal-actions'
import { maskClientName } from '@/server/masking'
import { formatMoney } from '@/format/money'
import { SourcedMoneyValue, SourcedRateValue } from '@/components/sourced-amount'
import { ProvenanceBadge } from '@/components/provenance-badge'
import { Th, Td, TableScroll } from '@/components/table'
import { getLocale } from '@/i18n/locale'
import { t } from '@/i18n/translations'
import type {
  ConventionalLoan,
  CreditCard,
  MurabahaFinancing,
  Obligation,
} from '@eltizamati/domain'
import { localDateFromDate } from '@eltizamati/domain'
import { resolveFormula } from '@eltizamati/finance-engine'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const locale = await getLocale()

  if (!isUserAllowlisted(userId)) {
    return (
      <div>
        <h1 className="page-title">Client not available</h1>
        <div className="card">
          <p>{t(locale, 'warning.notAllowlisted')}</p>
        </div>
      </div>
    )
  }

  const [profilesResult, obligationsResult, insightsResult, calcRunsResult, proposalsResult] =
    await Promise.all([
      listAllowlistedProfiles(),
      listAllowlistedObligations(),
      listAllowlistedInsights(),
      listAllowlistedCalculationRuns(),
      listAllowlistedScheduleProposals(),
    ])

  if (
    !profilesResult.ok ||
    !obligationsResult.ok ||
    !insightsResult.ok ||
    !calcRunsResult.ok ||
    !proposalsResult.ok
  ) {
    return (
      <div>
        <h1 className="page-title">Client detail</h1>
        <div className="card">
          <p>{t(locale, 'warning.couldNotLoadData')}</p>
        </div>
      </div>
    )
  }

  const profile = profilesResult.value.find((p) => p.userId === userId)
  const obligations = obligationsResult.value.filter((o) => o.userId === userId)
  const insights = insightsResult.value.filter((i) => i.userId === userId)
  const calcRuns = calcRunsResult.value.filter((r) => r.userId === userId)
  const proposals = proposalsResult.value.filter((proposal) => proposal.user_id === userId)

  const paymentsResult = await listAllowlistedPayments(obligationsResult.value)
  const payments = paymentsResult.ok ? paymentsResult.value.filter((p) => p.userId === userId) : []

  if (profile === undefined) {
    return (
      <div>
        <h1 className="page-title">Client not found</h1>
        <div className="card">
          <p>{t(locale, 'warning.noProfile')}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title">{maskClientName(profile.fullName, profile.userId)}</h1>
      <p className="page-subtitle">
        <Link href="/clients">{t(locale, 'clientSummary.backToClients')}</Link>
      </p>

      <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 16, marginBlockStart: 0 }}>{t(locale, 'clientSummary.title')}</h2>
        <dl
          style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', margin: 0 }}
        >
          <dt style={{ color: 'var(--color-text-secondary)' }}>
            {t(locale, 'clientSummary.language')}
          </dt>
          <dd>{profile.locale.toUpperCase()}</dd>
          <dt style={{ color: 'var(--color-text-secondary)' }}>
            {t(locale, 'clientSummary.primaryBank')}
          </dt>
          <dd>{profile.primaryBank ?? '—'}</dd>
          <dt style={{ color: 'var(--color-text-secondary)' }}>
            {t(locale, 'clientSummary.dataMode')}
          </dt>
          <dd>{profile.dataMode}</dd>
          <dt style={{ color: 'var(--color-text-secondary)' }}>
            {t(locale, 'clientSummary.updated')}
          </dt>
          <dd>{profile.updatedAt.slice(0, 10)}</dd>
        </dl>
      </div>

      <h2 style={{ fontSize: 18 }}>Obligations</h2>
      {obligations.length === 0 ? (
        <div className="card">No obligations on file for this client.</div>
      ) : (
        obligations.map((obligation) => (
          <ObligationCard
            key={obligation.id}
            obligation={obligation}
            proposals={proposals.filter((proposal) => proposal.obligation_id === obligation.id)}
          />
        ))
      )}

      <h2 style={{ fontSize: 18, marginBlockStart: 'var(--space-6)' }}>Payment history</h2>
      <div className="card" style={{ marginBlockEnd: 'var(--space-6)' }}>
        {payments.length === 0 ? (
          <p>No payments on file.</p>
        ) : (
          <TableScroll>
            <table className="table">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Amount</Th>
                  <Th>Allocation</Th>
                </tr>
              </thead>
              <tbody>
                {payments
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((payment) => (
                    <tr key={payment.id}>
                      <Td>{payment.date}</Td>
                      <Td className="figure">{formatMoney(payment.amount)}</Td>
                      <Td>
                        {payment.allocation === undefined
                          ? '—'
                          : `${formatMoney(payment.allocation.principal)} principal / ${formatMoney(payment.allocation.cost)} cost (${payment.allocation.allocationSource})`}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>

      <h2 style={{ fontSize: 18 }}>Calculations</h2>
      <div className="card" style={{ marginBlockEnd: 'var(--space-6)' }}>
        {calcRuns.length === 0 ? (
          <p>No calculation runs on file.</p>
        ) : (
          <TableScroll>
            <table className="table">
              <thead>
                <tr>
                  <Th>Formula</Th>
                  <Th>As of</Th>
                  <Th>Outcome</Th>
                </tr>
              </thead>
              <tbody>
                {calcRuns.map((run) => (
                  <tr key={run.id}>
                    <Td>
                      {run.formulaId} v{run.formulaVersion}
                    </Td>
                    <Td>{run.asOf}</Td>
                    <Td>
                      {run.outcome.kind === 'result' ? (
                        <span className="status-pill status-pill--ready">
                          result ({run.outcome.confidence})
                        </span>
                      ) : (
                        <span className="status-pill status-pill--missing">
                          refused ({run.outcome.missingFields.join(', ')})
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
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

function ObligationCard({
  obligation,
  proposals,
}: {
  obligation: Obligation
  proposals: readonly ScheduleProposalRow[]
}) {
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
        {obligation.kind === 'conventionalLoan' ? (
          <LoanFields loan={obligation} proposals={proposals} />
        ) : null}
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

function LoanFields({
  loan,
  proposals,
}: {
  loan: ConventionalLoan
  proposals: readonly ScheduleProposalRow[]
}) {
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
          '—'
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
        <TableScroll>
          <table className="table" style={{ marginBlockStart: 4 }}>
            <thead>
              <tr>
                <Th>Effective from</Th>
                <Th>Rate</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {[...loanDetails.ratePeriods]
                .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1))
                .map((period) => (
                  <tr key={period.id}>
                    <Td>{period.effectiveFrom}</Td>
                    <Td className="figure">{period.annualRate.toPercent().toFixed(3)}%</Td>
                    <Td>{period.supersededBy === undefined ? 'Active' : 'Superseded'}</Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </TableScroll>
      </details>
      <ScheduleAgreement loan={loan} proposals={proposals} />
    </div>
  )
}

interface SnapshotRow {
  readonly period: number
  readonly date?: string
  readonly payment: string | number
  readonly principal?: string | number
  readonly cost?: string | number
  readonly closingBalance?: string | number
  readonly finalBalloonAmount?: string | number
}

function snapshotRows(value: unknown): readonly SnapshotRow[] {
  if (!Array.isArray(value)) return []
  return value.filter((row): row is SnapshotRow => {
    if (typeof row !== 'object' || row === null) return false
    const candidate = row as Record<string, unknown>
    return (
      typeof candidate.period === 'number' &&
      (typeof candidate.payment === 'string' || typeof candidate.payment === 'number')
    )
  })
}

function ScheduleAgreement({
  loan,
  proposals,
}: {
  loan: ConventionalLoan
  proposals: readonly ScheduleProposalRow[]
}) {
  const pending = proposals.find((proposal) => proposal.status === 'pending')
  const approved = proposals.find((proposal) => proposal.status === 'approved')
  const agreedRows =
    approved === undefined
      ? calculateCurrentAgreedRows(loan)
      : snapshotRows(approved.schedule_snapshot)

  return (
    <div
      style={{
        marginBlockStart: 16,
        borderBlockStart: '1px solid var(--color-border)',
        paddingBlockStart: 12,
      }}
    >
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Agreed payment schedule</h4>
      {approved === undefined ? (
        <>
          <p style={{ fontSize: 13 }}>
            Current contractual terms: {formatMoney(loan.loanDetails.installment.value)} per
            installment, maturity {loan.loanDetails.maturityDate}. The rows below preserve the
            unchanged agreed installment and show any projected final balloon clearly.
          </p>
          <ScheduleSnapshotTable rows={agreedRows} currency={loan.currency} />
        </>
      ) : (
        <>
          <p style={{ fontSize: 13 }}>
            Bank-approved {approved.proposal_kind} proposal · accepted{' '}
            {approved.decided_at?.slice(0, 10)}. This frozen snapshot is the current agreement.
          </p>
          <ScheduleSnapshotTable rows={agreedRows} currency={approved.currency} />
        </>
      )}

      {pending !== undefined ? (
        <div
          className="card"
          style={{ marginBlockStart: 12, background: 'var(--color-surface-subtle)' }}
        >
          <h4 style={{ marginBlockStart: 0 }}>Pending customer proposal</h4>
          <p style={{ fontSize: 13 }}>
            {pending.proposal_kind} · proposed installment {pending.proposed_installment}{' '}
            {pending.currency}
            {' · '}final balloon {pending.final_balloon} {pending.currency}. The agreed schedule
            remains unchanged until approval.
          </p>
          <ScheduleSnapshotTable
            rows={snapshotRows(pending.schedule_snapshot)}
            currency={pending.currency}
          />
          <form action={decideScheduleProposalAction} style={{ marginBlockStart: 12 }}>
            <input type="hidden" name="proposalId" value={pending.id} />
            <label style={{ display: 'block', fontSize: 13, marginBlockEnd: 8 }}>
              Rejection reason
              <input
                name="decisionReason"
                className="input"
                style={{ display: 'block', width: '100%', marginBlockStart: 4 }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button button--primary" name="decision" value="approve">
                Accept as agreed schedule
              </button>
              <button className="button" name="decision" value="reject">
                Reject proposal
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {proposals.some(
        (proposal) => proposal.status === 'rejected' || proposal.status === 'superseded',
      ) ? (
        <details style={{ marginBlockStart: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12 }}>Proposal history</summary>
          <ul>
            {proposals
              .filter(
                (proposal) => proposal.status === 'rejected' || proposal.status === 'superseded',
              )
              .map((proposal) => (
                <li key={proposal.id}>
                  {proposal.created_at.slice(0, 10)} · {proposal.proposal_kind} · {proposal.status}
                  {proposal.decision_reason === null ? '' : ` · ${proposal.decision_reason}`}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

function ScheduleSnapshotTable({
  rows,
  currency,
}: {
  rows: readonly SnapshotRow[]
  currency: string
}) {
  if (rows.length === 0) return <p style={{ fontSize: 13 }}>No row snapshot is available.</p>
  return (
    <TableScroll>
      <table className="table">
        <thead>
          <tr>
            <Th>Period</Th>
            <Th>Date</Th>
            <Th>Payment</Th>
            <Th>Principal</Th>
            <Th>Interest</Th>
            <Th>Closing balance</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period}>
              <Td>
                {row.period}
                {row.finalBalloonAmount === undefined
                  ? ''
                  : ` · final balloon ${row.finalBalloonAmount} ${currency}`}
              </Td>
              <Td>{row.date ?? '—'}</Td>
              <Td className="figure">
                {row.payment} {currency}
              </Td>
              <Td className="figure">{row.principal ?? '—'}</Td>
              <Td className="figure">{row.cost ?? '—'}</Td>
              <Td className="figure">{row.closingBalance ?? '—'}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  )
}

function calculateCurrentAgreedRows(loan: ConventionalLoan): readonly SnapshotRow[] {
  const formula = resolveFormula('variableProjection', 1)
  if (!formula.ok) return []
  const outcome = formula.value.execute({
    principal: loan.loanDetails.originalPrincipal.value,
    ratePeriods: loan.loanDetails.ratePeriods,
    termMonths: loan.loanDetails.termMonths.value,
    startDate: loan.loanDetails.startDate,
    installment: loan.loanDetails.installment.value,
    installmentPolicy: { kind: 'unchanged' },
    asOf: localDateFromDate(new Date()),
  })
  if (outcome.kind === 'refused') return []

  const futureRows = outcome.value.schedule.filter((entry) => entry.date > outcome.value.asOf)
  const balloon =
    loan.loanDetails.contractualBalloon?.value ?? outcome.value.projectedResidualAtMaturity
  return futureRows.map((entry, index) => ({
    period: entry.period,
    date: entry.date,
    payment: entry.payment.toStorageString(),
    principal: entry.principal.toStorageString(),
    cost: entry.cost.toStorageString(),
    closingBalance: entry.closingBalance.toStorageString(),
    ...(index === futureRows.length - 1 && balloon.isPositive()
      ? { finalBalloonAmount: balloon.toStorageString() }
      : {}),
  }))
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
