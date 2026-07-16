/**
 * Demo rate-campaign writes (Phase 4). Every write here goes through either
 * `demo_publish_rate_campaign` (the one atomic transaction that appends
 * rate history) or `demo_record_excluded_targets` (a plain, non-atomic
 * insert with no side effects) — this module never issues a raw INSERT
 * against `rate_periods` itself.
 */
import { err, ok, makeError, type AppError, type Result } from '@eltizamati/domain'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import type { ServicingPolicy } from '../impact-preview-service'
import type { EligibilityExclusionReason } from '../rate-campaign-eligibility'

export interface PublishCampaignInput {
  readonly campaignId: string
  readonly campaignName: string
  readonly institutionName: string
  readonly reason: string | undefined
  readonly sourceNote: string | undefined
  readonly oldAnnualRateDecimal: string | undefined
  readonly newAnnualRateDecimal: string
  readonly effectiveDate: string
  readonly installmentPolicy: ServicingPolicy
  readonly emailNotificationEnabled: boolean
  readonly targetObligationIds: readonly string[]
}

export interface PublishedCampaign {
  readonly id: string
  readonly status: string
  readonly publishedAt: string | null
}

export async function publishRateCampaign(
  input: PublishCampaignInput,
): Promise<Result<PublishedCampaign, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value.rpc('demo_publish_rate_campaign', {
    p_campaign_id: input.campaignId,
    p_campaign_name: input.campaignName,
    p_institution_name: input.institutionName,
    p_reason: input.reason ?? null,
    p_source_note: input.sourceNote ?? null,
    p_old_annual_rate:
      input.oldAnnualRateDecimal !== undefined ? Number(input.oldAnnualRateDecimal) : null,
    p_new_annual_rate: Number(input.newAnnualRateDecimal),
    p_effective_date: input.effectiveDate,
    p_installment_policy: input.installmentPolicy,
    p_email_notification_enabled: input.emailNotificationEnabled,
    p_target_obligation_ids: [...input.targetObligationIds],
  })

  if (error !== null) {
    return err(
      makeError('storage', {
        // The RPC's own `raise exception '...'` text (e.g. "obligation % is not a
        // variable-rate loan") lands in error.message — surfacing it is the only way
        // to see *why* a publish failed instead of the generic 'storage' code.
        safeMetadata: { postgresErrorCode: error.code, postgresErrorMessage: error.message },
        cause: error,
      }),
    )
  }

  return ok({ id: data.id, status: data.status, publishedAt: data.published_at })
}

export async function recordExcludedTargets(
  campaignId: string,
  excluded: readonly { obligationId: string; userId: string; reason: EligibilityExclusionReason }[],
): Promise<Result<void, AppError>> {
  if (excluded.length === 0) return ok(undefined)

  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { error } = await clientResult.value.rpc('demo_record_excluded_targets', {
    p_campaign_id: campaignId,
    p_obligation_ids: excluded.map((x) => x.obligationId),
    p_user_ids: excluded.map((x) => x.userId),
    p_reasons: excluded.map((x) => x.reason),
  })

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(undefined)
}

export interface DemoCampaignRow {
  readonly id: string
  readonly campaignName: string
  readonly institutionName: string
  readonly newAnnualRate: number
  readonly effectiveDate: string
  readonly installmentPolicy: string
  readonly status: string
  readonly createdAt: string
  readonly publishedAt: string | null
}

export async function listDemoCampaigns(): Promise<Result<readonly DemoCampaignRow[], AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('demo_rate_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(
    data.map((row) => ({
      id: row.id,
      campaignName: row.campaign_name,
      institutionName: row.institution_name,
      newAnnualRate: row.new_annual_rate,
      effectiveDate: row.effective_date,
      installmentPolicy: row.installment_policy,
      status: row.status,
      createdAt: row.created_at,
      publishedAt: row.published_at,
    })),
  )
}

export interface DemoCampaignTargetRow {
  readonly campaignId: string
  readonly obligationId: string
  readonly userId: string
  readonly eligibility: string
  readonly exclusionReason: string | null
}

export async function listDemoCampaignTargets(): Promise<
  Result<readonly DemoCampaignTargetRow[], AppError>
> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value.from('demo_rate_campaign_targets').select('*')

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(
    data.map((row) => ({
      campaignId: row.campaign_id,
      obligationId: row.obligation_id,
      userId: row.user_id,
      eligibility: row.eligibility,
      exclusionReason: row.exclusion_reason,
    })),
  )
}
