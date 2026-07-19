/**
 * Insight reads across all personal accounts (the demo allowlist has been
 * removed). The dashboard never raises an insight itself in Phase 2 — it reads
 * whatever the mobile app (or, from Phase 4, this app's own publish flow)
 * already persisted.
 */
import { err, ok, makeError, type AppError, type Insight, type Result } from '@eltizamati/domain'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import { insightDomainToRow, insightRowToDomain } from '../mappers/insight-mapper'

export async function listAllowlistedInsights(): Promise<Result<readonly Insight[], AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value.from('insights').select('*')

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(data.map(insightRowToDomain))
}

/**
 * Raises an insight the publish flow's rule evaluators produced (Phase 4).
 * Dedup by (rule_id, obligation_id, trigger_hash) is the unique index
 * itself (20260712000009_insights.sql) — a duplicate raise is a no-op
 * conflict, not an error, mirroring FR-INS-004.
 */
export async function raiseInsight(insight: Insight): Promise<Result<Insight, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('insights')
    .upsert(insightDomainToRow(insight), { onConflict: 'rule_id,obligation_id,trigger_hash' })
    .select('*')
    .single()

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(insightRowToDomain(data))
}
