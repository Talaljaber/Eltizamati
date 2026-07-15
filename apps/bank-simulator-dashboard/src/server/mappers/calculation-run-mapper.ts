/**
 * calculation_runs row -> CalculationRun mapper (read-only). Mirrors
 * apps/mobile/.../mappers/calculation-run-mapper.ts's `calculationRunRowToDomain`.
 */
import {
  brandId,
  DomainInvariantError,
  toLocalDate,
  type CalculationRun,
  type Confidence,
} from '@eltizamati/domain'
import type { Database, Json } from '../supabase/database.types'

type CalculationRunRow = Database['public']['Tables']['calculation_runs']['Row']

function toConfidence(value: string): Confidence {
  if (value === 'official' || value === 'high' || value === 'medium' || value === 'low')
    return value
  throw new DomainInvariantError(
    'validation',
    `Unexpected calculation_runs.confidence value: "${value}"`,
  )
}

function toMissingFields(value: Json): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new DomainInvariantError(
      'validation',
      'calculation_runs.missing_fields_json is not a string array',
    )
  }
  return value
}

export function calculationRunRowToDomain(row: CalculationRunRow): CalculationRun {
  const outcome: CalculationRun['outcome'] =
    row.outcome_kind === 'result'
      ? {
          kind: 'result',
          confidence: toConfidence(row.confidence ?? ''),
          resultSnapshot: row.result_json as CalculationRun['inputsSnapshot'],
        }
      : row.outcome_kind === 'refused'
        ? {
            kind: 'refused',
            missingFields: toMissingFields(row.missing_fields_json ?? []),
            partialSnapshot:
              row.partial_json !== null
                ? (row.partial_json as CalculationRun['inputsSnapshot'])
                : undefined,
          }
        : (() => {
            throw new DomainInvariantError(
              'validation',
              `Unexpected calculation_runs.outcome_kind value: "${row.outcome_kind}"`,
            )
          })()

  return {
    id: brandId<'calculationRun'>(row.id),
    userId: brandId<'user'>(row.user_id),
    obligationId: row.obligation_id !== null ? brandId<'obligation'>(row.obligation_id) : undefined,
    formulaId: row.formula_id,
    formulaVersion: row.formula_version,
    asOf: toLocalDate(row.as_of),
    inputsSnapshot: row.inputs_json as CalculationRun['inputsSnapshot'],
    inputsHash: row.inputs_hash,
    outcome,
    assumptions: toMissingFields(row.assumptions_json),
    calculatedAt: row.calculated_at,
  }
}
