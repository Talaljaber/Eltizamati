/**
 * Allowlist-gated insight reads. The dashboard never raises an insight
 * itself in Phase 2 — it reads whatever the mobile app (or, from Phase 4,
 * this app's own publish flow) already persisted.
 */
import { err, ok, makeError, type AppError, type Insight, type Result } from '@eltizamati/domain'
import { assertAllowlistConfigured } from '../allowlist'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import { insightRowToDomain } from '../mappers/insight-mapper'

export async function listAllowlistedInsights(): Promise<Result<readonly Insight[], AppError>> {
  const allowedUserIds = assertAllowlistConfigured()

  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('insights')
    .select('*')
    .in('user_id', allowedUserIds)

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(data.map(insightRowToDomain))
}
