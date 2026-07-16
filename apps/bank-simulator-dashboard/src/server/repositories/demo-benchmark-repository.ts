/**
 * Demo benchmark-rate simulation records (docs/dashboard.md §7.F, Phase 5).
 * `demo_benchmark_rates` has no foreign key to `obligations` or
 * `rate_periods` on purpose (see the migration's own table comment) — a
 * recorded benchmark change never mutates a single contract by itself.
 */
import { err, ok, makeError, type AppError, type Result } from '@eltizamati/domain'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import type { Database } from '../supabase/database.types'

export interface RecordBenchmarkSimulationInput {
  readonly benchmarkName: string
  /** Percentage points as typed on the form (e.g. "5" for 5%) — NOT a decimal fraction. */
  readonly previousRatePercent: string
  readonly newRatePercent: string
  readonly announcementDate: string
  readonly effectiveDate: string
  readonly explanation: string | undefined
}

export interface BenchmarkSimulationRow {
  readonly id: string
  readonly benchmarkName: string
  /** Percentage points (e.g. 5 for 5%) — this table's own convention, deliberately
   * independent of rate_periods.annual_rate's decimal-fraction convention, since a
   * benchmark record never feeds a calculation (see the migration's own comment). */
  readonly previousRatePercent: number
  readonly newRatePercent: number
  readonly announcementDate: string
  readonly effectiveDate: string
  readonly explanation: string | null
  readonly createdAt: string
}

export async function recordBenchmarkSimulation(
  input: RecordBenchmarkSimulationInput,
): Promise<Result<BenchmarkSimulationRow, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('demo_benchmark_rates')
    .insert({
      benchmark_name: input.benchmarkName,
      previous_rate: Number(input.previousRatePercent),
      new_rate: Number(input.newRatePercent),
      announcement_date: input.announcementDate,
      effective_date: input.effectiveDate,
      explanation: input.explanation ?? null,
    })
    .select('*')
    .single()

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(toDomain(data))
}

export async function listBenchmarkSimulations(): Promise<
  Result<readonly BenchmarkSimulationRow[], AppError>
> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('demo_benchmark_rates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(data.map(toDomain))
}

function toDomain(
  row: Database['public']['Tables']['demo_benchmark_rates']['Row'],
): BenchmarkSimulationRow {
  return {
    id: row.id,
    benchmarkName: row.benchmark_name,
    previousRatePercent: row.previous_rate,
    newRatePercent: row.new_rate,
    announcementDate: row.announcement_date,
    effectiveDate: row.effective_date,
    explanation: row.explanation,
    createdAt: row.created_at,
  }
}
