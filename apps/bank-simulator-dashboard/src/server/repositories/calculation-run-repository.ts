/** Allowlist-gated calculation-run reads (client detail's "calculations" section). */
import {
  err,
  ok,
  makeError,
  type AppError,
  type CalculationRun,
  type Result,
} from '@eltizamati/domain'
import { assertAllowlistConfigured } from '../allowlist'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import { calculationRunRowToDomain } from '../mappers/calculation-run-mapper'

export async function listAllowlistedCalculationRuns(): Promise<
  Result<readonly CalculationRun[], AppError>
> {
  const allowedUserIds = assertAllowlistConfigured()

  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('calculation_runs')
    .select('*')
    .in('user_id', allowedUserIds)

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(data.map(calculationRunRowToDomain))
}
