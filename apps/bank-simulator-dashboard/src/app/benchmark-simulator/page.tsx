import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listBenchmarkSimulations } from '@/server/repositories/demo-benchmark-repository'
import { computeBenchmarkImpact } from '@/server/benchmark-impact-service'
import { Th, Td, TableScroll } from '@/components/table'
import { recordBenchmarkSimulationAction } from './actions'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function str(searchParams: SearchParams, key: string): string | undefined {
  const value = searchParams[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export default async function BenchmarkSimulatorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolved = await searchParams
  const recordedId = str(resolved, 'recorded')
  const recordError = str(resolved, 'recordError')

  const [obligationsResult, simulationsResult] = await Promise.all([
    listAllowlistedObligations(),
    listBenchmarkSimulations(),
  ])

  const impact = obligationsResult.ok
    ? computeBenchmarkImpact(obligationsResult.value)
    : undefined

  return (
    <div>
      <h1 className="page-title">Benchmark Simulator</h1>
      <p className="page-subtitle">
        Record a simulated Central Bank (CBJ) benchmark announcement as its own standalone fact.
        It is never applied to a borrower&apos;s contract automatically — no rate period is
        appended and no installment changes as a result of this page. Each bank picks up the
        latest benchmark on the Bank Rate Simulator page, adds its own margin, and publishes at
        the time of its choosing.
      </p>

      {recordedId !== undefined ? (
        <div className="card" style={{ marginBlockEnd: 'var(--space-4)' }}>
          <p style={{ margin: 0 }}>
            Benchmark simulation recorded (id <span className="figure">{recordedId}</span>). No
            contract was updated.
          </p>
        </div>
      ) : null}
      {recordError !== undefined ? (
        <div className="card" style={{ marginBlockEnd: 'var(--space-4)' }}>
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>
            Could not save the benchmark simulation ({recordError}).
          </p>
        </div>
      ) : null}

      <form action={recordBenchmarkSimulationAction} className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>Record a simulated benchmark change</h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            Benchmark name
            <input
              type="text"
              name="benchmarkName"
              required
              placeholder="e.g. CBJ policy rate"
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            Previous rate (%)
            <input
              type="number"
              name="previousRate"
              step="0.001"
              min="0"
              max="100"
              required
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)', width: 120 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            New rate (%)
            <input
              type="number"
              name="newRate"
              step="0.001"
              min="0"
              max="100"
              required
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)', width: 120 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            Announcement date
            <input
              type="date"
              name="announcementDate"
              required
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            Effective date
            <input
              type="date"
              name="effectiveDate"
              required
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
            />
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2, marginBlockStart: 'var(--space-3)' }}>
          Explanation (optional)
          <textarea
            name="explanation"
            rows={2}
            style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
          />
        </label>
        <button type="submit" className="button-primary" style={{ marginBlockStart: 'var(--space-3)' }}>
          Record simulation
        </button>
      </form>

      <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>Contract impact</h3>
        {impact === undefined ? (
          <p>Could not load data. Check Demo Settings for configuration state.</p>
        ) : (
          <>
            <p style={{ fontWeight: 600 }}>{impact.contractImpactMessage}</p>
            <p style={{ margin: 0 }}>
              <strong>{impact.potentiallyAffected.length}</strong> variable-rate conventional loan
              {impact.potentiallyAffected.length === 1 ? '' : 's'} potentially move with some
              benchmark, based on rate type alone. All <strong>{impact.missingBenchmarkInfoCount}</strong>{' '}
              of them are missing the benchmark identity, margin/spread, and repricing terms needed
              to compute an actual new rate — this dashboard does not store those fields for any
              loan, so none is invented here.
            </p>
          </>
        )}
      </div>

      {impact !== undefined && impact.potentiallyAffected.length > 0 ? (
        <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
          <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>Potentially affected loans</h3>
          <TableScroll>
            <table className="table">
              <thead>
                <tr>
                  <Th>Nickname</Th>
                  <Th>Institution</Th>
                  <Th>Benchmark/margin data</Th>
                </tr>
              </thead>
              <tbody>
                {impact.potentiallyAffected.map((loan) => (
                  <tr key={loan.obligationId}>
                    <Td>{loan.nickname}</Td>
                    <Td>{loan.institution}</Td>
                    <Td>
                      <span className="status-pill status-pill--missing">Missing</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
      ) : null}

      <div className="card">
        <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>Recorded benchmark simulations</h3>
        {!simulationsResult.ok ? (
          <p>Could not load recorded simulations.</p>
        ) : simulationsResult.value.length === 0 ? (
          <p>No benchmark simulations recorded yet.</p>
        ) : (
          <TableScroll>
            <table className="table">
              <thead>
                <tr>
                  <Th>Benchmark</Th>
                  <Th>Previous → New</Th>
                  <Th>Announced</Th>
                  <Th>Effective</Th>
                  <Th>Recorded</Th>
                </tr>
              </thead>
              <tbody>
                {simulationsResult.value.map((sim) => (
                  <tr key={sim.id}>
                    <Td>{sim.benchmarkName}</Td>
                    <Td className="figure">
                      {sim.previousRatePercent.toFixed(3)}% → {sim.newRatePercent.toFixed(3)}%
                    </Td>
                    <Td>{sim.announcementDate}</Td>
                    <Td>{sim.effectiveDate}</Td>
                    <Td>{sim.createdAt.slice(0, 16).replace('T', ' ')}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>
    </div>
  )
}
