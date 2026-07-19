/** Calculation-run reads across all accounts (client detail's "calculations" section). */
import {
  err,
  ok,
  makeError,
  type AppError,
  type CalculationRun,
  type Result,
} from '@eltizamati/domain'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import {
  calculationRunDomainToRow,
  calculationRunRowToDomain,
} from '../mappers/calculation-run-mapper'

export async function listAllowlistedCalculationRuns(): Promise<
  Result<readonly CalculationRun[], AppError>
> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value.from('calculation_runs').select('*')

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(data.map(calculationRunRowToDomain))
}

/**
 * Persists a `calculation_run` the publish flow just computed (Phase 4).
 * Mirrors `apps/mobile/src/services/calculation-service.ts#runCalculation`'s
 * persistence step — this module doesn't execute formulas itself, only
 * writes an already-computed `CalculationRun`.
 */
export async function persistCalculationRun(
  run: CalculationRun,
): Promise<Result<CalculationRun, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('calculation_runs')
    .insert(calculationRunDomainToRow(run))
    .select('*')
    .single()

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(calculationRunRowToDomain(data))
}
