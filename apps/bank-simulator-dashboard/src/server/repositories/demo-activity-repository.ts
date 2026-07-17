/**
 * Demo activity log (docs/dashboard.md §13). `service_role` holds SELECT +
 * INSERT only on this table (20260716000000) — there is no UPDATE/DELETE
 * grant, so this module physically cannot offer an update/delete function.
 */
import { err, ok, makeError, type AppError, type Result } from '@eltizamati/domain'
import { getServiceRoleSupabaseClient } from '../supabase/client'

export type DemoActivityEventType =
  | 'campaign_created'
  | 'campaign_previewed'
  | 'rate_period_appended'
  | 'calculation_evaluated'
  | 'insight_generated'
  | 'email_queued'
  | 'email_sent'
  | 'email_suppressed'
  | 'operation_failed'
  | 'loan_application_submitted'
  | 'loan_application_approved'
  | 'loan_application_rejected'

export async function recordActivity(
  eventType: DemoActivityEventType,
  summary: string,
  campaignId?: string,
): Promise<Result<void, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { error } = await clientResult.value.from('demo_dashboard_activity').insert({
    event_type: eventType,
    campaign_id: campaignId ?? null,
    summary,
  })

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(undefined)
}

export interface DemoActivityRow {
  readonly id: string
  readonly eventType: string
  readonly campaignId: string | null
  readonly summary: string
  readonly createdAt: string
}

export async function listRecentActivity(
  limit = 100,
): Promise<Result<readonly DemoActivityRow[], AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('demo_dashboard_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(
    data.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      campaignId: row.campaign_id,
      summary: row.summary,
      createdAt: row.created_at,
    })),
  )
}
