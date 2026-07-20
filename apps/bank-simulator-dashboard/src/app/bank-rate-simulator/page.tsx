import { DomainInvariantError, Rate, localDateFromDate, toLocalDate } from '@eltizamati/domain'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { listBenchmarkSimulations } from '@/server/repositories/demo-benchmark-repository'
import {
  evaluateRateCampaignEligibility,
  EXCLUSION_REASON_LABEL,
} from '@/server/rate-campaign-eligibility'
import { computeImpactPreview, type ServicingPolicy } from '@/server/impact-preview-service'
import { JORDAN_BANKS } from '@/server/jordan-banks'
import { ALL_INSTITUTIONS } from '@/server/rate-campaign-constants'
import { formatMoney, formatRate } from '@/format/money'
import { getLocale } from '@/i18n/locale'
import { t, type Locale } from '@/i18n/translations'
import { Th, Td, TableScroll } from '@/components/table'
import { publishCampaignAction } from './actions'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function str(searchParams: SearchParams, key: string): string | undefined {
  const value = searchParams[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function parseRate(raw: string | undefined): Rate | undefined {
  if (raw === undefined) return undefined
  try {
    return Rate.fromPercent(raw)
  } catch (error) {
    if (error instanceof DomainInvariantError) return undefined
    throw error
  }
}

/** Sum of two percent-form rate inputs, unbounded (a wide margin can push the effective rate past what a single Rate.fromPercent would accept). */
function addPercent(benchmark: Rate, marginRaw: string | undefined): Rate | undefined {
  const margin = parseRate(marginRaw)
  if (margin === undefined) return undefined
  return benchmark.plus(margin)
}

function parseDate(raw: string | undefined): ReturnType<typeof toLocalDate> | undefined {
  if (raw === undefined) return undefined
  try {
    return toLocalDate(raw)
  } catch (error) {
    if (error instanceof DomainInvariantError) return undefined
    throw error
  }
}

export default async function BankRateSimulatorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolved = await searchParams
  const today = localDateFromDate(new Date())
  const locale = await getLocale()

  const [obligationsResult, benchmarkResult] = await Promise.all([
    listAllowlistedObligations(),
    listBenchmarkSimulations(),
  ])
  if (!obligationsResult.ok) {
    return (
      <div>
        <h1 className="page-title">{t(locale, 'bankRateSimulator.title')}</h1>
        <div className="card">
          <p>{t(locale, 'warning.couldNotLoadData')}</p>
        </div>
      </div>
    )
  }
  const obligations = obligationsResult.value
  const latestBenchmark = benchmarkResult.ok ? benchmarkResult.value[0] : undefined

  if (latestBenchmark === undefined) {
    return (
      <div>
        <h1 className="page-title">{t(locale, 'bankRateSimulator.title')}</h1>
        <div className="card">
          <p>{t(locale, 'bankRateSimulator.noBenchmark')}</p>
        </div>
      </div>
    )
  }
  const benchmarkRate = Rate.fromPercent(String(latestBenchmark.newRatePercent))

  // The full curated bank catalogue, plus any institution name already present in the
  // seeded data that isn't in it — so nothing already working (exact-string matched
  // against obligations.institution_name by eligibility/publish) can silently disappear.
  const curatedNames = JORDAN_BANKS.map((b) => b.name)
  const curatedNameSet = new Set(curatedNames)
  const uncuratedNames = [...new Set(obligations.map((o) => o.institution.name))]
    .filter((name) => !curatedNameSet.has(name))
    .sort()
  const institutions = [...curatedNames, ...uncuratedNames]

  const institution = str(resolved, 'institution')
  const marginInput = str(resolved, 'margin')
  const newAnnualRate = addPercent(benchmarkRate, marginInput)
  const effectiveDate = parseDate(str(resolved, 'effectiveDate')) ?? today
  const servicingPolicy: ServicingPolicy = 'unchanged'

  const hasSubmitted = institution !== undefined && newAnnualRate !== undefined
  const applyToAll = institution === ALL_INSTITUTIONS

  const eligibility = hasSubmitted
    ? evaluateRateCampaignEligibility(
        obligations,
        applyToAll ? undefined : institution,
        effectiveDate,
      )
    : undefined

  const eligibleInstitutionCount = eligibility
    ? new Set(eligibility.eligible.map((e) => e.obligation.institution.name)).size
    : 0

  return (
    <div>
      <h1 className="page-title">{t(locale, 'bankRateSimulator.title')}</h1>
      <p className="page-subtitle">{t(locale, 'bankRateSimulator.subtitle')}</p>

      <form method="get" className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <div
          style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'end' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            {t(locale, 'bankRateSimulator.institution')}
            <select
              name="institution"
              defaultValue={institution ?? ''}
              required
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
            >
              <option value="" disabled>
                {t(locale, 'bankRateSimulator.selectInstitution')}
              </option>
              <option value={ALL_INSTITUTIONS}>
                {t(locale, 'bankRateSimulator.allInstitutions')}
              </option>
              {institutions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            {t(locale, 'bankRateSimulator.currentBenchmark')}
            <input
              type="text"
              readOnly
              disabled
              value={`${latestBenchmark.newRatePercent.toFixed(3)}% (${latestBenchmark.benchmarkName})`}
              style={{
                padding: 4,
                borderRadius: 4,
                border: '1px solid var(--color-border)',
                width: 220,
                color: 'var(--color-text-secondary)',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            {t(locale, 'bankRateSimulator.margin')}
            <input
              type="number"
              name="margin"
              step="0.001"
              min="0"
              max="100"
              defaultValue={marginInput ?? ''}
              required
              style={{
                padding: 4,
                borderRadius: 4,
                border: '1px solid var(--color-border)',
                width: 120,
              }}
            />
          </label>
          {newAnnualRate !== undefined ? (
            <p style={{ margin: 0, fontSize: 12 }}>
              {t(locale, 'bankRateSimulator.effectiveRate')}:{' '}
              <strong className="figure">{formatRate(newAnnualRate)}</strong>
            </p>
          ) : null}
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            {t(locale, 'bankRateSimulator.effectiveDate')}
            <input
              type="date"
              name="effectiveDate"
              defaultValue={str(resolved, 'effectiveDate') ?? today}
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
            />
          </label>
          <p style={{ margin: 0, fontSize: 12, maxInlineSize: 220 }}>
            {t(locale, 'bankRateSimulator.policyUnchanged')}
          </p>
          <button type="submit" className="button-primary">
            {t(locale, 'bankRateSimulator.previewCampaign')}
          </button>
        </div>
      </form>

      {institution === undefined || eligibility === undefined || newAnnualRate === undefined ? (
        <div className="card">
          <p>{t(locale, 'bankRateSimulator.selectPrompt')}</p>
        </div>
      ) : (
        <>
          <CampaignPreview
            eligibility={eligibility}
            newAnnualRate={newAnnualRate}
            effectiveDate={effectiveDate}
            servicingPolicy={servicingPolicy}
            today={today}
            locale={locale}
          />
          {eligibility.eligible.length > 0 ? (
            <form
              action={publishCampaignAction}
              className="card"
              style={{ marginBlockStart: 'var(--space-5)' }}
            >
              <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>
                {t(locale, 'bankRateSimulator.publishSection')}
              </h3>
              <input type="hidden" name="institution" value={institution} />
              <input type="hidden" name="margin" value={marginInput ?? ''} />
              <input type="hidden" name="effectiveDate" value={effectiveDate} />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  maxInlineSize: 480,
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                  {t(locale, 'bankRateSimulator.campaignName')}
                  <input
                    type="text"
                    name="campaignName"
                    required
                    defaultValue={`${applyToAll ? t(locale, 'bankRateSimulator.allInstitutions') : institution} rate adjustment — ${effectiveDate}`}
                    style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                  {t(locale, 'bankRateSimulator.reason')}
                  <input
                    type="text"
                    name="reason"
                    style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                  {t(locale, 'bankRateSimulator.sourceNote')}
                  <input
                    type="text"
                    name="sourceNote"
                    style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" name="emailNotificationEnabled" />
                  {t(locale, 'bankRateSimulator.sendEmail')}
                </label>
                {applyToAll && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
                    Publishes one campaign per institution ({eligibleInstitutionCount}) — the
                    activity log will show each one separately.
                  </p>
                )}
                <button type="submit" className="button-primary">
                  {t(locale, 'bankRateSimulator.publishButton')} ({eligibility.eligible.length} loan
                  {eligibility.eligible.length === 1 ? '' : 's'}
                  {applyToAll ? `, ${eligibleInstitutionCount} institutions` : ''})
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}
    </div>
  )
}

function CampaignPreview({
  eligibility,
  newAnnualRate,
  effectiveDate,
  servicingPolicy,
  today,
  locale,
}: {
  eligibility: ReturnType<typeof evaluateRateCampaignEligibility>
  newAnnualRate: Rate
  effectiveDate: ReturnType<typeof toLocalDate>
  servicingPolicy: ServicingPolicy
  today: ReturnType<typeof toLocalDate>
  locale: Locale
}) {
  return (
    <div>
      <div className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <p style={{ margin: 0 }}>
          <strong>{eligibility.eligible.length}</strong> eligible loan
          {eligibility.eligible.length === 1 ? '' : 's'} ·{' '}
          <strong>{eligibility.excluded.length}</strong> excluded
        </p>
      </div>

      {eligibility.eligible.map(({ obligation, currentRate }) => {
        const preview = computeImpactPreview({
          loan: obligation,
          newAnnualRate,
          effectiveDate,
          servicingPolicy,
          asOf: today,
        })
        return (
          <div key={obligation.id} className="card" style={{ marginBlockEnd: 'var(--space-4)' }}>
            <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>
              {obligation.nickname}{' '}
              <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                · {obligation.institution.name}
              </span>
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Current rate: <span className="figure">{formatRate(currentRate)}</span> → New rate:{' '}
              <span className="figure">{formatRate(newAnnualRate)}</span>, effective {effectiveDate}
            </p>
            {preview.kind === 'unavailable' ? (
              <p>
                <span className="status-pill status-pill--missing">
                  {t(locale, 'impactPreview.unavailable')}
                </span>{' '}
                {preview.reason}
              </p>
            ) : (
              <ImpactPreviewDisplay preview={preview} locale={locale} />
            )}
          </div>
        )
      })}

      {eligibility.excluded.length > 0 ? (
        <div className="card">
          <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>
            {t(locale, 'bankRateSimulator.excludedObligations')}
          </h3>
          <TableScroll>
            <table className="table">
              <thead>
                <tr>
                  <Th>Nickname</Th>
                  <Th>Institution</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody>
                {eligibility.excluded.map((x) => (
                  <tr key={x.obligationId}>
                    <Td>{x.nickname}</Td>
                    <Td>{x.institution}</Td>
                    <Td>{EXCLUSION_REASON_LABEL[x.reason]}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
      ) : null}
    </div>
  )
}

function ImpactPreviewDisplay({
  preview,
  locale,
}: {
  preview: Extract<ReturnType<typeof computeImpactPreview>, { kind: 'available' }>
  locale: Locale
}) {
  return (
    <div>
      <p style={{ fontStyle: 'italic', fontSize: 13 }}>{t(locale, 'impactPreview.narrative')}</p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', margin: 0 }}>
        <dt>{t(locale, 'impactPreview.installment')}</dt>
        <dd className="figure">{formatMoney(preview.installment)}</dd>
        <dt>{t(locale, 'impactPreview.installmentPolicy')}</dt>
        <dd>{preview.installmentPolicy}</dd>
        <dt>{t(locale, 'impactPreview.previousInterest')}</dt>
        <dd className="figure">{formatMoney(preview.previousInterestPortion)}</dd>
        <dt>{t(locale, 'impactPreview.newInterest')}</dt>
        <dd className="figure">{formatMoney(preview.newInterestPortion)}</dd>
        <dt>{t(locale, 'impactPreview.previousPrincipal')}</dt>
        <dd className="figure">{formatMoney(preview.previousPrincipalPortion)}</dd>
        <dt>{t(locale, 'impactPreview.newPrincipal')}</dt>
        <dd className="figure">{formatMoney(preview.newPrincipalPortion)}</dd>
        <dt>{t(locale, 'impactPreview.contractualMaturity')}</dt>
        <dd>{preview.contractualMaturityDate}</dd>
        <dt>{t(locale, 'impactPreview.projectedResidual')}</dt>
        <dd className="figure">
          {formatMoney(preview.projectedResidualAtMaturity)}
          {preview.hasResidualRisk ? (
            <span className="status-pill status-pill--missing" style={{ marginInlineStart: 6 }}>
              {t(locale, 'impactPreview.residualRisk')}
            </span>
          ) : null}
        </dd>
        <dt>{t(locale, 'impactPreview.additionalInstallments')}</dt>
        <dd>{preview.estimatedEquivalentAdditionalInstallments ?? '—'}</dd>
      </dl>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBlockEnd: 0 }}>
        {t(locale, 'impactPreview.assumptions')}: {preview.assumptions.join(' ')}
      </p>
      {preview.negativeAmortizationPeriods.length > 0 ? (
        <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
          {t(locale, 'impactPreview.negativeAmortization', {
            count: preview.negativeAmortizationPeriods.length,
          })}
        </p>
      ) : null}
    </div>
  )
}
