import { localDateFromDate } from '@eltizamati/domain'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listAllowlistedInsights } from '@/server/repositories/insight-repository'
import {
  buildClientDirectoryRows,
  filterClientDirectoryRows,
  type ClientDirectoryFilters,
} from '@/server/client-directory-service'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function param(searchParams: SearchParams, key: string): string | undefined {
  const value = searchParams[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function parseFilters(searchParams: SearchParams): ClientDirectoryFilters {
  const productType = param(searchParams, 'productType')
  const rateExposure = param(searchParams, 'rateExposure')
  const obligationState = param(searchParams, 'obligationState')
  const completeness = param(searchParams, 'completeness')
  const locale = param(searchParams, 'locale')
  return {
    productType:
      productType === 'conventionalLoan' ||
      productType === 'murabaha' ||
      productType === 'creditCard' ||
      productType === 'ijara' ||
      productType === 'diminishingMusharakah' ||
      productType === 'genericFacility'
        ? productType
        : undefined,
    institution: param(searchParams, 'institution'),
    rateExposure:
      rateExposure === 'fixed' || rateExposure === 'variable' ? rateExposure : undefined,
    obligationState:
      obligationState === 'active' || obligationState === 'closed' ? obligationState : undefined,
    completeness:
      completeness === 'complete' || completeness === 'incomplete' ? completeness : undefined,
    locale: locale === 'en' || locale === 'ar' ? locale : undefined,
  }
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const today = localDateFromDate(new Date())
  const resolvedSearchParams = await searchParams

  const [profilesResult, obligationsResult, insightsResult] = await Promise.all([
    listAllowlistedProfiles(),
    listAllowlistedObligations(),
    listAllowlistedInsights(),
  ])

  if (!profilesResult.ok || !obligationsResult.ok || !insightsResult.ok) {
    return (
      <div>
        <h1 className="page-title">Clients</h1>
        <div className="card">
          <p>Could not load allowlisted data. Check Demo Settings for configuration state.</p>
        </div>
      </div>
    )
  }

  const allRows = buildClientDirectoryRows(
    profilesResult.value,
    obligationsResult.value,
    insightsResult.value,
    today,
  )
  const filters = parseFilters(resolvedSearchParams)
  const rows = filterClientDirectoryRows(allRows, filters)

  const institutions = [...new Set(allRows.flatMap((r) => r.institutions))].sort()

  return (
    <div>
      <h1 className="page-title">Clients</h1>
      <p className="page-subtitle">
        Allowlisted demo clients only — {allRows.length} client{allRows.length === 1 ? '' : 's'}{' '}
        configured, {rows.length} shown.
      </p>

      <form method="get" className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <FilterSelect
            name="productType"
            label="Product type"
            value={filters.productType}
            options={[
              ['conventionalLoan', 'Conventional loan'],
              ['murabaha', 'Murabaha'],
              ['creditCard', 'Credit card'],
              ['ijara', 'Ijara'],
              ['diminishingMusharakah', 'Diminishing Musharakah'],
              ['genericFacility', 'Generic facility'],
            ]}
          />
          <FilterSelect
            name="institution"
            label="Institution"
            value={filters.institution}
            options={institutions.map((i) => [i, i] as const)}
          />
          <FilterSelect
            name="rateExposure"
            label="Fixed / variable"
            value={filters.rateExposure}
            options={[
              ['fixed', 'Fixed only'],
              ['variable', 'Has variable'],
            ]}
          />
          <FilterSelect
            name="obligationState"
            label="Active / closed"
            value={filters.obligationState}
            options={[
              ['active', 'Has active'],
              ['closed', 'Has closed'],
            ]}
          />
          <FilterSelect
            name="completeness"
            label="Data completeness"
            value={filters.completeness}
            options={[
              ['complete', 'Complete'],
              ['incomplete', 'Incomplete'],
            ]}
          />
          <FilterSelect
            name="locale"
            label="Language"
            value={filters.locale}
            options={[
              ['en', 'English'],
              ['ar', 'Arabic'],
            ]}
          />
          <button type="submit" className="button-primary">
            Apply filters
          </button>
          <a href="/clients" className="button-secondary" style={{ textDecoration: 'none' }}>
            Clear
          </a>
        </div>
      </form>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'start', borderBlockEnd: '2px solid var(--color-border)' }}>
              <Th>Client</Th>
              <Th>Language</Th>
              <Th>Primary bank</Th>
              <Th># Obligations</Th>
              <Th>Monthly commitment</Th>
              <Th>Variable exposure</Th>
              <Th>Active insights</Th>
              <Th>Data completeness</Th>
              <Th>Last updated</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} style={{ borderBlockEnd: '1px solid var(--color-border)' }}>
                <Td>{row.maskedName}</Td>
                <Td>{row.locale.toUpperCase()}</Td>
                <Td>{row.primaryBank ?? '—'}</Td>
                <Td>{row.obligationCount}</Td>
                <Td className="figure">{row.totalKnownMonthlyCommitment} JOD</Td>
                <Td>{row.hasVariableRateExposure ? 'Yes' : 'No'}</Td>
                <Td>{row.activeInsightCount}</Td>
                <Td>
                  <span
                    className={`status-pill status-pill--${row.dataCompleteness === 'complete' ? 'ready' : 'missing'}`}
                  >
                    {row.dataCompleteness}
                  </span>
                </Td>
                <Td>{row.lastUpdated.slice(0, 10)}</Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                  No clients match the selected filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '8px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={className} style={{ padding: '8px', fontSize: 13 }}>
      {children}
    </td>
  )
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string
  label: string
  value: string | undefined
  options: readonly (readonly [string, string])[]
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
      {label}
      <select
        name={name}
        defaultValue={value ?? ''}
        style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
      >
        <option value="">All</option>
        {options.map(([optValue, optLabel]) => (
          <option key={optValue} value={optValue}>
            {optLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
