/**
 * rate_periods row <-> RatePeriod mapper. `annual_rate` is a generated-type
 * `number` (Postgrest serializes NUMERIC as a JSON number) — Rate's Decimal
 * internals exist precisely to avoid float precision loss, so the column
 * value is always routed through a decimal string, never handed to
 * Rate.fromDecimal as a raw number.
 */
import { brandId, Rate, toLocalDate, type RatePeriod } from '@eltizamati/domain'
import type { Database } from '../../../../core/supabase/database.types'
import { jsonToProvenance, provenanceToJson } from './provenance-json'

type RatePeriodRow = Database['public']['Tables']['rate_periods']['Row']
type RatePeriodInsert = Database['public']['Tables']['rate_periods']['Insert']

export function ratePeriodRowToDomain(row: RatePeriodRow): RatePeriod {
  return {
    id: brandId<'ratePeriod'>(row.id),
    obligationId: brandId<'obligation'>(row.obligation_id),
    annualRate: Rate.fromDecimal(String(row.annual_rate)),
    effectiveFrom: toLocalDate(row.effective_from),
    supersededBy: row.superseded_by !== null ? brandId<'ratePeriod'>(row.superseded_by) : undefined,
    provenance: jsonToProvenance(row.provenance_json),
    createdAt: row.created_at,
  }
}

/**
 * RatePeriod carries no `userId` field (its ownership is implied through its
 * parent Obligation) but the row's composite-FK ownership design (Phase 3,
 * database-schema.md §1.11) requires an explicit `user_id` column — the
 * caller supplies it from the authenticated session, never fabricated here.
 */
export function ratePeriodDomainToRow(period: RatePeriod, userId: string): RatePeriodInsert {
  return {
    id: period.id,
    obligation_id: period.obligationId,
    user_id: userId,
    annual_rate: Number(period.annualRate.toStorageString()),
    effective_from: period.effectiveFrom,
    superseded_by: period.supersededBy ?? null,
    provenance_json: provenanceToJson(period.provenance),
    created_at: period.createdAt,
  }
}
