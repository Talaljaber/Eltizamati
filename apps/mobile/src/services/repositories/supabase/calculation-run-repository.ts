import type { SupabaseClient } from '@supabase/supabase-js'
import {
  err,
  ok,
  makeError,
  type Result,
  type AppError,
  type Id,
  type CalculationRun,
  type CalculationRunRepository,
} from '@eltizamati/domain'
import type { Database } from '../../../core/supabase/database.types'
import {
  calculationRunDomainToRow,
  calculationRunRowToDomain,
} from './mappers/calculation-run-mapper'

function toStorageAppError(error: { code: string; message: string }): AppError {
  return makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error })
}

export class SupabaseCalculationRunRepository implements CalculationRunRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async latestFor(
    obligationId: Id<'obligation'> | undefined,
    formulaId: string,
  ): Promise<Result<CalculationRun | undefined, AppError>> {
    let query = this.client.from('calculation_runs').select('*').eq('formula_id', formulaId)
    query =
      obligationId !== undefined
        ? query.eq('obligation_id', obligationId)
        : query.is('obligation_id', null)

    const { data, error } = await query
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return err(toStorageAppError(error))
    return ok(data !== null ? calculationRunRowToDomain(data) : undefined)
  }

  /** Immutable once written (no update policy) — persist is always an insert. */
  async persist(run: CalculationRun): Promise<Result<CalculationRun, AppError>> {
    const { data, error } = await this.client
      .from('calculation_runs')
      .insert(calculationRunDomainToRow(run))
      .select('*')
      .single()
    if (error) return err(toStorageAppError(error))
    return ok(calculationRunRowToDomain(data))
  }
}
