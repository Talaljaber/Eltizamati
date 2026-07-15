import { localDateFromDate } from '@eltizamati/domain'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listAllowlistedInsights } from '@/server/repositories/insight-repository'
import { computeOverviewStats, type AggregateFigure } from '@/server/overview-service'
import { formatMoney } from '@/format/money'

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

  const [profilesResult, obligationsResult, insightsResult] = await Promise.all([
    listAllowlistedProfiles(),
    listAllowlistedObligations(),
    listAllowlistedInsights(),
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

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 'var(--space-4)',
  }

  return (
    <div>
      <h1 className="page-title">Overview</h1>
      <p className="page-subtitle">
        Aggregate figures across allowlisted demo clients only. Every total is labeled by data
        quality; missing values are excluded and counted, never treated as zero.
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

      <div style={grid}>
        <StatTile label="Upcoming maturities (90 days)" value={stats.upcomingMaturities.length} />
        <StatTile label="Active residual-risk insights" value={stats.activeResidualRiskInsights} />
        <StatTile
          label="High-utilization credit cards"
          value={stats.highUtilizationCards.length}
          caption=">70% of credit limit"
        />
        <StatTile
          label="Recent simulated rate changes"
          value="—"
          caption="Available from Phase 4"
        />
        <StatTile label="Email queue status" value="—" caption="Available from Phase 4" />
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
          Could not load allowlisted data (code: {code}). Check Demo Settings for configuration
          state.
        </p>
      </div>
    </div>
  )
}
