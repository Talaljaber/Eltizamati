import Link from 'next/link'
import { localDateFromDate } from '@eltizamati/domain'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listAllowlistedInsights } from '@/server/repositories/insight-repository'
import { listDemoCampaigns } from '@/server/repositories/demo-campaign-repository'
import { listEmailOutbox } from '@/server/repositories/demo-email-outbox-repository'
import { listAllowlistedScheduleProposals } from '@/server/repositories/schedule-proposal-repository'
import { computeOverviewStats, type AggregateFigure } from '@/server/overview-service'
import { formatMoney } from '@/format/money'
import { DonutChart } from '@/components/charts/donut-chart'

export const dynamic = 'force-dynamic'

const QUALITY_LABEL: Record<string, string> = {
  official: 'Official',
  userEntered: 'User-entered',
  estimated: 'Estimated',
  mixed: 'Mixed sources',
}

function AggregateTile({ label, figure }: { label: string; figure: AggregateFigure }) {
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</div>
      <div className="figure" style={{ fontSize: 24, fontWeight: 700, marginBlock: 4 }}>
        {formatMoney(figure.amount)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
        {figure.quality !== undefined ? QUALITY_LABEL[figure.quality] : 'No data yet'}
        {figure.excludedCount > 0
          ? ` · ${figure.excludedCount} obligation${figure.excludedCount === 1 ? '' : 's'} excluded (missing data)`
          : ''}
      </div>
    </div>
  )
}

function StatLinkTile({
  label,
  value,
  caption,
  href,
}: {
  label: string
  value: string | number
  caption?: string
  href: string
}) {
  return (
    <Link href={href} className="card" style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</div>
      <div
        className="figure"
        style={{ fontSize: 24, fontWeight: 700, marginBlock: 4, color: 'var(--color-text-primary)' }}
      >
        {value}
      </div>
      {caption !== undefined ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{caption}</div>
      ) : null}
    </Link>
  )
}

function StatTile({
  label,
  value,
  caption,
}: {
  label: string
  value: string | number
  caption?: string
}) {
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</div>
      <div className="figure" style={{ fontSize: 24, fontWeight: 700, marginBlock: 4 }}>
        {value}
      </div>
      {caption !== undefined ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{caption}</div>
      ) : null}
    </div>
  )
}

export default async function OverviewPage() {
  const today = localDateFromDate(new Date())

  const [
    profilesResult,
    obligationsResult,
    insightsResult,
    campaignsResult,
    outboxResult,
    proposalsResult,
  ] = await Promise.all([
    listAllowlistedProfiles(),
    listAllowlistedObligations(),
    listAllowlistedInsights(),
    listDemoCampaigns(),
    listEmailOutbox(),
    listAllowlistedScheduleProposals(),
  ])

  if (!profilesResult.ok) return <ErrorState code={profilesResult.error.code} />
  if (!obligationsResult.ok) return <ErrorState code={obligationsResult.error.code} />
  if (!insightsResult.ok) return <ErrorState code={insightsResult.error.code} />

  const stats = computeOverviewStats(
    profilesResult.value.length,
    obligationsResult.value,
    insightsResult.value,
    today,
  )

  const recentCampaignCount = campaignsResult.ok ? campaignsResult.value.length : undefined
  const pendingEmailCount = outboxResult.ok
    ? outboxResult.value.filter((row) => row.status === 'queued').length
    : undefined
  const pendingProposalCount = proposalsResult.ok
    ? proposalsResult.value.filter((row) => row.status === 'pending').length
    : undefined

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 'var(--space-4)',
  }

  return (
    <div>
      <h1 className="page-title">Overview</h1>
      <p className="page-subtitle">
        Aggregate figures across every client. Every total is labeled by data quality; missing
        values are excluded and counted, never treated as zero.
      </p>

      <div style={{ ...grid, marginBlockEnd: 'var(--space-6)' }}>
        <StatTile label="Demo clients" value={stats.totalClients} />
        <StatTile label="Active obligations" value={stats.activeObligations} />
        <StatTile label="Conventional loans" value={stats.conventionalLoans} />
        <StatTile label="Murabaha agreements" value={stats.murabahaAgreements} />
        <StatTile label="Credit cards" value={stats.creditCards} />
        <StatTile label="Incomplete-data obligations" value={stats.incompleteDataCount} />
      </div>

      <div style={{ ...grid, marginBlockEnd: 'var(--space-6)' }}>
        <AggregateTile label="Total known outstanding balances" figure={stats.totalOutstanding} />
        <AggregateTile
          label="Total known monthly commitments"
          figure={stats.totalMonthlyCommitment}
        />
        <StatTile
          label="Fixed-rate exposure"
          value={formatMoney(stats.fixedRateExposure.amount)}
          caption={`${stats.fixedRateExposure.loanCount} loan${stats.fixedRateExposure.loanCount === 1 ? '' : 's'}`}
        />
        <StatTile
          label="Variable-rate exposure"
          value={formatMoney(stats.variableRateExposure.amount)}
          caption={`${stats.variableRateExposure.loanCount} loan${stats.variableRateExposure.loanCount === 1 ? '' : 's'}`}
        />
      </div>

      {stats.fixedRateExposure.loanCount + stats.variableRateExposure.loanCount > 0 ? (
        <div className="card chart-card" style={{ marginBlockEnd: 'var(--space-6)' }}>
          <h3 className="section-title">Rate-type mix (by loan count)</h3>
          <p className="section-summary">
            Conventional loans only — see Portfolio for the full balance-weighted breakdown.
          </p>
          <DonutChart
            ariaLabel="Loans by rate type"
            centerValue={String(stats.fixedRateExposure.loanCount + stats.variableRateExposure.loanCount)}
            centerLabel="loans"
            data={[
              { label: 'Fixed', value: stats.fixedRateExposure.loanCount, color: 'var(--chart-cat-1)' },
              {
                label: 'Variable',
                value: stats.variableRateExposure.loanCount,
                color: 'var(--chart-cat-2)',
              },
              { label: 'Mixed/unknown', value: stats.otherRateTypeLoanCount, color: 'var(--chart-cat-3)' },
            ]}
          />
        </div>
      ) : null}

      <div style={grid}>
        <StatLinkTile
          label="Schedule proposals awaiting review"
          value={pendingProposalCount ?? '—'}
          caption={pendingProposalCount === undefined ? 'Could not load' : 'View all →'}
          href="/schedule-proposals"
        />
        <StatTile label="Upcoming maturities (90 days)" value={stats.upcomingMaturities.length} />
        <StatTile label="Active residual-risk insights" value={stats.activeResidualRiskInsights} />
        <StatTile
          label="High-utilization credit cards"
          value={stats.highUtilizationCards.length}
          caption=">70% of credit limit"
        />
        <StatTile
          label="Recorded rate campaigns"
          value={recentCampaignCount ?? '—'}
          caption={recentCampaignCount === undefined ? 'Could not load' : undefined}
        />
        <StatTile
          label="Emails queued (not yet sent)"
          value={pendingEmailCount ?? '—'}
          caption={pendingEmailCount === undefined ? 'Could not load' : undefined}
        />
      </div>
    </div>
  )
}

function ErrorState({ code }: { code: string }) {
  return (
    <div>
      <h1 className="page-title">Overview</h1>
      <div className="card">
        <p>
          Could not load data (code: {code}). Check Demo Settings for configuration state.
        </p>
      </div>
    </div>
  )
}
