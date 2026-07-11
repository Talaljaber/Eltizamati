/**
 * calculation_runs row <-> CalculationRun mapper. `outcome_kind` shape-checks
 * (result vs. refused) mirror the migration's own CHECK constraint
 * (calculation_runs_outcome_shape_check) — the DB already enforces this
 * invariant, this is the infra-boundary re-validation before it becomes a
 * typed CalculationOutcome.
 */
import {
  brandId,
  DomainInvariantError,
  toLocalDate,
  type CalculationRun,
  type Confidence,
} from '@eltizamati/domain'
import type { Database, Json } from '../../../../core/supabase/database.types'

type CalculationRunRow = Database['public']['Tables']['calculation_runs']['Row']
type CalculationRunInsert = Database['public']['Tables']['calculation_runs']['Insert']

const VALID_CONFIDENCES: readonly Confidence[] = ['official', 'high', 'medium', 'low']

function toConfidence(value: string): Confidence {
  if ((VALID_CONFIDENCES as readonly string[]).includes(value)) return value as Confidence
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

export function calculationRunDomainToRow(run: CalculationRun): CalculationRunInsert {
  const isResult = run.outcome.kind === 'result'
  return {
    id: run.id,
    user_id: run.userId,
    obligation_id: run.obligationId ?? null,
    formula_id: run.formulaId,
    formula_version: run.formulaVersion,
    as_of: run.asOf,
    inputs_json: run.inputsSnapshot as Json,
    inputs_hash: run.inputsHash,
    outcome_kind: run.outcome.kind,
    confidence: isResult ? run.outcome.confidence : null,
    result_json: isResult ? (run.outcome.resultSnapshot as Json) : null,
    missing_fields_json: !isResult ? (run.outcome.missingFields as unknown as Json) : null,
    partial_json:
      !isResult && run.outcome.partialSnapshot !== undefined
        ? (run.outcome.partialSnapshot as Json)
        : null,
    assumptions_json: run.assumptions as unknown as Json,
    calculated_at: run.calculatedAt,
  }
}
