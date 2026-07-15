import { DomainInvariantError, Rate, localDateFromDate, toLocalDate } from '@eltizamati/domain'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import {
  evaluateRateCampaignEligibility,
  EXCLUSION_REASON_LABEL,
} from '@/server/rate-campaign-eligibility'
import { computeImpactPreview, type ServicingPolicy } from '@/server/impact-preview-service'
import { formatMoney, formatRate } from '@/format/money'
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

  const obligationsResult = await listAllowlistedObligations()
  if (!obligationsResult.ok) {
    return (
      <div>
        <h1 className="page-title">Bank Rate Simulator</h1>
        <div className="card">
          <p>Could not load allowlisted data. Check Demo Settings for configuration state.</p>
        </div>
      </div>
    )
  }
  const obligations = obligationsResult.value

  const institutions = [...new Set(obligations.map((o) => o.institution.name))].sort()

  const institution = str(resolved, 'institution')
  const newAnnualRate = parseRate(str(resolved, 'newAnnualRate'))
  const effectiveDate = parseDate(str(resolved, 'effectiveDate')) ?? today
  const servicingPolicy =
    (str(resolved, 'servicingPolicy') as ServicingPolicy | undefined) ?? 'unchanged'

  const hasSubmitted = institution !== undefined && newAnnualRate !== undefined

  const eligibility = hasSubmitted
    ? evaluateRateCampaignEligibility(obligations, institution)
    : undefined

  return (
    <div>
      <h1 className="page-title">Bank Rate Simulator</h1>
      <p className="page-subtitle">
        Preview a rate change, then publish to append the real rate history, re-run the affected
        loans&apos; calculations and insights, and queue notifications. Rate history is append-only
        — publishing never rewrites an existing rate period.
      </p>

      <form method="get" className="card" style={{ marginBlockEnd: 'var(--space-5)' }}>
        <div
          style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'end' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            Institution
            <select
              name="institution"
              defaultValue={institution ?? ''}
              required
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
            >
              <option value="" disabled>
                Select institution
              </option>
              {institutions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            New annual rate (%)
            <input
              type="number"
              name="newAnnualRate"
              step="0.001"
              min="0"
              max="100"
              defaultValue={str(resolved, 'newAnnualRate') ?? ''}
              required
              style={{
                padding: 4,
                borderRadius: 4,
                border: '1px solid var(--color-border)',
                width: 120,
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            Effective date
            <input
              type="date"
              name="effectiveDate"
              defaultValue={str(resolved, 'effectiveDate') ?? today}
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
            Installment policy
            <select
              name="servicingPolicy"
              defaultValue={servicingPolicy}
              style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
            >
              <option value="unchanged">Unchanged installment (default)</option>
              <option value="recalculated">Recalculated installment</option>
              <option value="unknownTreatment">Unknown contract treatment</option>
            </select>
          </label>
          <button type="submit" className="button-primary">
            Preview campaign
          </button>
        </div>
      </form>

      {institution === undefined || eligibility === undefined || newAnnualRate === undefined ? (
        <div className="card">
          <p>
            Select an institution and a new annual rate to preview eligible loans and their impact.
          </p>
        </div>
      ) : (
        <>
          <CampaignPreview
            eligibility={eligibility}
            newAnnualRate={newAnnualRate}
            effectiveDate={effectiveDate}
            servicingPolicy={servicingPolicy}
            today={today}
          />
          {eligibility.eligible.length > 0 ? (
            <form
              action={publishCampaignAction}
              className="card"
              style={{ marginBlockStart: 'var(--space-5)' }}
            >
              <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>Publish this campaign</h3>
              <input type="hidden" name="institution" value={institution} />
              <input
                type="hidden"
                name="newAnnualRate"
                value={str(resolved, 'newAnnualRate') ?? ''}
              />
              <input type="hidden" name="effectiveDate" value={effectiveDate} />
              <input type="hidden" name="servicingPolicy" value={servicingPolicy} />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  maxInlineSize: 480,
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                  Campaign name
                  <input
                    type="text"
                    name="campaignName"
                    required
                    defaultValue={`${institution} rate adjustment — ${effectiveDate}`}
                    style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                  Reason
                  <input
                    type="text"
                    name="reason"
                    style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, gap: 2 }}>
                  Source note
                  <input
                    type="text"
                    name="sourceNote"
                    style={{ padding: 4, borderRadius: 4, border: '1px solid var(--color-border)' }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" name="emailNotificationEnabled" />
                  Send email notifications (subject to the recipient allowlist and current email
                  mode)
                </label>
                <button type="submit" className="button-primary">
                  Publish campaign ({eligibility.eligible.length} loan
                  {eligibility.eligible.length === 1 ? '' : 's'})
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
}: {
  eligibility: ReturnType<typeof evaluateRateCampaignEligibility>
  newAnnualRate: Rate
  effectiveDate: ReturnType<typeof toLocalDate>
  servicingPolicy: ServicingPolicy
  today: ReturnType<typeof toLocalDate>
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
            <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>{obligation.nickname}</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Current rate: <span className="figure">{formatRate(currentRate)}</span> → New rate:{' '}
              <span className="figure">{formatRate(newAnnualRate)}</span>, effective {effectiveDate}
            </p>
            {preview.kind === 'unavailable' ? (
              <p>
                <span className="status-pill status-pill--missing">Unavailable</span>{' '}
                {preview.reason}
              </p>
            ) : (
              <ImpactPreviewDisplay preview={preview} />
            )}
          </div>
        )
      })}

      {eligibility.excluded.length > 0 ? (
        <div className="card">
          <h3 style={{ marginBlockStart: 0, fontSize: 15 }}>Excluded obligations</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'start' }}>
                <th style={{ padding: 4 }}>Nickname</th>
                <th style={{ padding: 4 }}>Institution</th>
                <th style={{ padding: 4 }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {eligibility.excluded.map((x) => (
                <tr
                  key={x.obligationId}
                  style={{ borderBlockStart: '1px solid var(--color-border)' }}
                >
                  <td style={{ padding: 4 }}>{x.nickname}</td>
                  <td style={{ padding: 4 }}>{x.institution}</td>
                  <td style={{ padding: 4 }}>{EXCLUSION_REASON_LABEL[x.reason]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function ImpactPreviewDisplay({
  preview,
}: {
  preview: Extract<ReturnType<typeof computeImpactPreview>, { kind: 'available' }>
}) {
  return (
    <div>
      <p style={{ fontStyle: 'italic', fontSize: 13 }}>
        Your simulated interest rate increased while your monthly installment remained unchanged. A
        larger part of each payment now covers interest, leaving less to reduce the principal. Based
        on the available information, an estimated balance may remain at the original maturity date.
      </p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', margin: 0 }}>
        <dt>Monthly installment</dt>
        <dd className="figure">{formatMoney(preview.installment)}</dd>
        <dt>Installment policy</dt>
        <dd>{preview.installmentPolicy}</dd>
        <dt>Previous estimated interest portion</dt>
        <dd className="figure">{formatMoney(preview.previousInterestPortion)}</dd>
        <dt>New estimated interest portion</dt>
        <dd className="figure">{formatMoney(preview.newInterestPortion)}</dd>
        <dt>Previous estimated principal portion</dt>
        <dd className="figure">{formatMoney(preview.previousPrincipalPortion)}</dd>
        <dt>New estimated principal portion</dt>
        <dd className="figure">{formatMoney(preview.newPrincipalPortion)}</dd>
        <dt>Contractual maturity date</dt>
        <dd>{preview.contractualMaturityDate}</dd>
        <dt>Projected residual at maturity</dt>
        <dd className="figure">
          {formatMoney(preview.projectedResidualAtMaturity)}
          {preview.hasResidualRisk ? (
            <span className="status-pill status-pill--missing" style={{ marginInlineStart: 6 }}>
              Residual risk
            </span>
          ) : null}
        </dd>
        <dt>Estimated equivalent additional installments</dt>
        <dd>{preview.estimatedEquivalentAdditionalInstallments ?? '—'}</dd>
      </dl>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBlockEnd: 0 }}>
        Assumptions: {preview.assumptions.join(' ')}
      </p>
      {preview.negativeAmortizationPeriods.length > 0 ? (
        <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
          Negative amortization detected in {preview.negativeAmortizationPeriods.length} period(s).
        </p>
      ) : null}
    </div>
  )
}
