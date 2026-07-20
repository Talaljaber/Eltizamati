/**
 * rate_periods row -> RatePeriod mapper (read-only). Mirrors
 * apps/mobile/.../mappers/rate-period-mapper.ts's `ratePeriodRowToDomain`.
 * `annual_rate` is a generated-type `number` (Postgrest serializes NUMERIC
 * as a JSON number) — always routed through a decimal string before
 * reaching `Rate.fromDecimal`, never handed the raw number, to avoid float
 * precision loss.
 */
import { brandId, Rate, toLocalDate, type RatePeriod } from '@eltizamati/domain'
import type { Database } from '../supabase/database.types'
import { jsonToProvenance } from './provenance-json'

type RatePeriodRow = Database['public']['Tables']['rate_periods']['Row']

export function ratePeriodRowToDomain(row: RatePeriodRow): RatePeriod {
  return {
    id: brandId<'ratePeriod'>(row.id),
    obligationId: brandId<'obligation'>(row.obligation_id),
    annualRate: Rate.fromDecimal(String(row.annual_rate)),
    ...(row.benchmark_rate !== null && row.benchmark_rate !== undefined
      ? { benchmarkRate: Rate.fromDecimal(String(row.benchmark_rate)) }
      : {}),
    ...(row.margin !== null && row.margin !== undefined
      ? { margin: Rate.fromDecimal(String(row.margin)) }
      : {}),
    effectiveFrom: toLocalDate(row.effective_from),
    ...(row.superseded_by !== null
      ? { supersededBy: brandId<'ratePeriod'>(row.superseded_by) }
      : {}),
    provenance: jsonToProvenance(row.provenance_json),
    createdAt: row.created_at,
  }
}
