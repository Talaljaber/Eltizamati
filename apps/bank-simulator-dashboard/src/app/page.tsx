import Link from 'next/link'

/**
 * Overview — Phase 1 scaffold only. The real aggregates (total clients,
 * outstanding balances, provenance-labeled figures — docs/dashboard.md
 * §7.A) land in Phase 2, built on the allowlist-gated read models.
 */
export default function OverviewPage() {
  return (
    <div>
      <h1 className="page-title">Overview</h1>
      <p className="page-subtitle">
        Aggregate portfolio metrics land in Phase 2, built on the allowlist-gated read layer
        established in this phase.
      </p>
      <div className="card">
        <p>
          This phase establishes the app shell, environment guard, service-role Supabase boundary,
          and the test-data allowlist gate. See <Link href="/demo-settings">Demo Settings</Link> to
          confirm configuration state.
        </p>
      </div>
    </div>
  )
}
