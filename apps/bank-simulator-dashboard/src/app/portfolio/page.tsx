import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listAllowlistedInsights } from '@/server/repositories/insight-repository'
import { listEmailOutbox } from '@/server/repositories/demo-email-outbox-repository'
import {
  computePortfolioAnalytics,
  type Counted,
  type CountedAmount,
} from '@/server/portfolio-analytics-service'
import { formatMoney } from '@/format/money'
import { Th, Td, TableScroll } from '@/components/table'
import { DonutChart } from '@/components/charts/donut-chart'
import { BarChart, type BarChartDatum } from '@/components/charts/bar-chart'

export const dynamic = 'force-dynamic'

// ─── Chart color assignment (dataviz skill) ──────────────────────────────────
// Nominal distributions (no inherent order) get fixed categorical hues, in the
// order they're first seen. Ordinal distributions (bucket/chronological order
// carries meaning) get a single-hue lightness ramp instead — swapping their
// order would change what the color means, so they never take distinct hues.
// Severity/completeness/delivery-status are states, not identities, so they
// wear the reserved status palette. An "unknown"/missing bucket always renders
// muted — it never competes with a real category or ordinal step for a hue.

const CATEGORICAL = [
  'var(--chart-cat-1)',
  'var(--chart-cat-2)',
  'var(--chart-cat-3)',
  'var(--chart-cat-4)',
  'var(--chart-cat-5)',
  'var(--chart-cat-6)',
  'var(--chart-cat-7)',
  'var(--chart-cat-8)',
]
const ORDINAL = [
  'var(--chart-ordinal-1)',
  'var(--chart-ordinal-2)',
  'var(--chart-ordinal-3)',
  'var(--chart-ordinal-4)',
  'var(--chart-ordinal-5)',
  'var(--chart-ordinal-6)',
  'var(--chart-ordinal-7)',
]
const MUTED = 'var(--chart-ink-muted)'
const STATUS = {
  good: 'var(--chart-status-good)',
  warning: 'var(--chart-status-warning)',
  serious: 'var(--chart-status-serious)',
  critical: 'var(--chart-status-critical)',
}

function isUnknownLabel(label: string): boolean {
  return label.toLowerCase().includes('unknown')
}

/** Ordinal ramp indexed by position among the *known* rows — "unknown" rows are muted, not ranked. */
function ordinalBars(rows: readonly Counted[], displayValue?: (row: Counted) => string): BarChartDatum[] {
  const knownCount = rows.filter((r) => !isUnknownLabel(r.label)).length
  let knownIndex = 0
  return rows.map((row) => {
    if (isUnknownLabel(row.label)) {
      return { label: row.label, value: row.count, color: MUTED, displayValue: displayValue?.(row) }
    }
    const step =
      knownCount <= 1
        ? ORDINAL[ORDINAL.length - 1]
        : ORDINAL[Math.round((knownIndex / (knownCount - 1)) * (ORDINAL.length - 1))]
    knownIndex += 1
    return { label: row.label, value: row.count, color: step ?? MUTED, displayValue: displayValue?.(row) }
  })
}

function severityColor(label: string): string {
  if (label === 'urgent') return STATUS.critical
  if (label === 'attention') return STATUS.warning
  if (label === 'positive') return STATUS.good
  if (label === 'info') return 'var(--chart-ink-secondary)'
  return MUTED
}

function provenanceColor(label: string): string {
  if (label === 'official') return CATEGORICAL[0] ?? MUTED
  if (label === 'userEntered') return CATEGORICAL[1] ?? MUTED
  if (label === 'estimated') return CATEGORICAL[3] ?? MUTED
  if (label === 'mixed') return CATEGORICAL[5] ?? MUTED
  return MUTED
}

function deliveryStatusColor(label: string): string {
  if (label === 'sent') return STATUS.good
  if (label === 'queued' || label === 'preview') return CATEGORICAL[0] ?? MUTED
  if (label === 'failed') return STATUS.critical
  if (label === 'suppressed') return STATUS.warning
  return MUTED
}

function ChartCard({
  title,
  summary,
  chart,
  children,
}: {
  title: string
  summary: string
  chart: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="card chart-card" style={{ marginBlockEnd: 'var(--space-5)' }}>
      <h3 className="section-title">{title}</h3>
      <p className="section-summary">{summary}</p>
      {chart}
      <details style={{ marginBlockStart: 'var(--space-3)' }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>
          View as table
        </summary>
        <div style={{ marginBlockStart: 'var(--space-2)' }}>{children}</div>
      </details>
    </div>
  )
}

function AmountTable({ rows }: { rows: readonly CountedAmount[] }) {
  if (rows.length === 0) return <p style={{ fontSize: 13 }}>No data.</p>
  return (
    <TableScroll>
      <table className="table">
        <thead>
          <tr>
            <Th>Bucket</Th>
            <Th align="end">Count</Th>
            <Th align="end">Known balance total</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <Td>{row.label}</Td>
              <Td align="end" className="figure">
                {row.count}
              </Td>
              <Td align="end" className="figure">
                {formatMoney(row.amount)}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  )
}

function CountTable({ rows }: { rows: readonly Counted[] }) {
  if (rows.length === 0) return <p style={{ fontSize: 13 }}>No data.</p>
  return (
    <TableScroll>
      <table className="table">
        <thead>
          <tr>
            <Th>Bucket</Th>
            <Th align="end">Count</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <Td>{row.label}</Td>
              <Td align="end" className="figure">
                {row.count}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  )
}

export default async function PortfolioPage() {
  const [obligationsResult, insightsResult, outboxResult] = await Promise.all([
    listAllowlistedObligations(),
    listAllowlistedInsights(),
    listEmailOutbox(),
  ])

  if (!obligationsResult.ok || !insightsResult.ok) {
    return (
      <div>
        <h1 className="page-title">Portfolio</h1>
        <div className="card">
          <p>Could not load data. Check Demo Settings for configuration state.</p>
        </div>
      </div>
    )
  }

  const analytics = computePortfolioAnalytics(
    obligationsResult.value,
    insightsResult.value,
    outboxResult.ok ? outboxResult.value : [],
  )

  const byKindTotal = analytics.byKind.reduce((sum, r) => sum + r.count, 0)
  const rateTypeTotal = analytics.rateTypeDistribution.reduce((sum, r) => sum + r.count, 0)

  return (
    <div>
      <h1 className="page-title">Portfolio</h1>
      <p className="page-subtitle">
        Distributions across every client&apos;s obligations. Every chart has a table view beside
        it — the chart is a read, never the only record of the numbers.
      </p>

      <ChartCard
        title="By product type"
        summary={`${byKindTotal} active obligations across ${analytics.byKind.length} product type(s).`}
        chart={
          <DonutChart
            ariaLabel="Obligations by product type"
            centerValue={String(byKindTotal)}
            centerLabel="obligations"
            data={analytics.byKind.map((row, i) => ({
              label: row.label,
              value: row.count,
              color: CATEGORICAL[i % CATEGORICAL.length] ?? MUTED,
            }))}
          />
        }
      >
        <AmountTable rows={analytics.byKind} />
      </ChartCard>

      <ChartCard
        title="Balance distribution"
        summary="Active obligations bucketed by known outstanding balance (JOD). Obligations with no known balance are counted separately, not treated as zero."
        chart={
          <BarChart
            ariaLabel="Obligation count by outstanding balance bucket"
            data={ordinalBars(analytics.balanceBuckets)}
          />
        }
      >
        <AmountTable rows={analytics.balanceBuckets} />
      </ChartCard>

      <ChartCard
        title="Fixed vs. variable rate exposure"
        summary="Conventional loans only, by rate type."
        chart={
          <DonutChart
            ariaLabel="Loans by fixed vs. variable rate"
            centerValue={String(rateTypeTotal)}
            centerLabel="loans"
            data={analytics.rateTypeDistribution.map((row, i) => ({
              label: row.label,
              value: row.count,
              color: CATEGORICAL[i % CATEGORICAL.length] ?? MUTED,
            }))}
          />
        }
      >
        <AmountTable rows={analytics.rateTypeDistribution} />
      </ChartCard>

      <ChartCard
        title="Maturity timeline"
        summary="Conventional loans grouped by contractual maturity quarter."
        chart={
          <BarChart
            ariaLabel="Loan count by contractual maturity quarter"
            data={ordinalBars(analytics.maturityTimeline)}
          />
        }
      >
        <CountTable rows={analytics.maturityTimeline} />
      </ChartCard>

      <ChartCard
        title="Current rate distribution"
        summary="Conventional loans grouped by their latest active annual rate."
        chart={
          <BarChart
            ariaLabel="Loan count by current annual rate bucket"
            data={ordinalBars(analytics.rateBuckets)}
          />
        }
      >
        <CountTable rows={analytics.rateBuckets} />
      </ChartCard>

      <ChartCard
        title="Active insights by severity"
        summary="Unread insights raised across clients, by severity."
        chart={
          <BarChart
            ariaLabel="Active insight count by severity"
            data={analytics.insightSeverityDistribution.map((row) => ({
              label: row.label,
              value: row.count,
              color: severityColor(row.label),
            }))}
          />
        }
      >
        <CountTable rows={analytics.insightSeverityDistribution} />
      </ChartCard>

      <ChartCard
        title="Data provenance"
        summary="Active obligations grouped by the source class of their known outstanding balance (official/bureau/demo, user-entered, estimated, or unknown)."
        chart={
          <BarChart
            ariaLabel="Obligation count by data provenance"
            data={analytics.provenanceDistribution.map((row) => ({
              label: row.label,
              value: row.count,
              color: provenanceColor(row.label),
            }))}
          />
        }
      >
        <CountTable rows={analytics.provenanceDistribution} />
      </ChartCard>

      <ChartCard
        title="Data completeness"
        summary="Active obligations with all required fields for their kind present vs. missing at least one."
        chart={
          <BarChart
            ariaLabel="Obligation count by data completeness"
            data={analytics.completenessDistribution.map((row) => ({
              label: row.label,
              value: row.count,
              color: row.label === 'Complete' ? STATUS.good : STATUS.warning,
            }))}
          />
        }
      >
        <CountTable rows={analytics.completenessDistribution} />
      </ChartCard>

      <ChartCard
        title="Notification delivery status"
        summary="Every rate-change email this dashboard has ever queued, by its current outbox status."
        chart={
          <BarChart
            ariaLabel="Queued email count by delivery status"
            data={analytics.deliveryStatusDistribution.map((row) => ({
              label: row.label,
              value: row.count,
              color: deliveryStatusColor(row.label),
            }))}
          />
        }
      >
        <CountTable rows={analytics.deliveryStatusDistribution} />
      </ChartCard>
    </div>
  )
}
