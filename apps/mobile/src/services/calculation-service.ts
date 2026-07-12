import type {
  Id,
  LocalDate,
  CalculationRun,
  CalculationRunRepository,
  CalculationOutcome,
  CanonicalJsonValue,
  Result,
  AppError,
} from '@eltizamati/domain'
import {
  hashCanonicalJson,
  toCanonicalJsonValue,
  brandId,
  err,
  makeError,
} from '@eltizamati/domain'
import {
  resolveFormula,
  type FormulaId,
  type FormulaInput,
  type FormulaVersion,
} from '@eltizamati/finance-engine'

function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `calc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * CalculationService orchestrates the execution of pure finance-engine formulas
 * and persists the deterministic results as CalculationRun records.
 *
 * (Phase 6 integration requirement)
 */
export class CalculationService {
  constructor(private readonly repo: CalculationRunRepository) {}

  /**
   * Executes a finance-engine formula and persists the result.
   */
  async runCalculation<K extends FormulaId>(
    userId: Id<'user'>,
    obligationId: Id<'obligation'> | undefined,
    formulaId: K,
    formulaVersion: FormulaVersion,
    inputs: FormulaInput<K>,
    asOf: LocalDate,
    calculatedAt: string = new Date().toISOString(),
  ): Promise<Result<CalculationRun, AppError>> {
    const registryResult = resolveFormula(formulaId, formulaVersion)
    if (!registryResult.ok) {
      return err(registryResult.error)
    }
    const formulaMeta = registryResult.value
    const outcome = formulaMeta.execute(inputs)

    // Money/Rate/Percentage carry their value in JS `#` private fields, which
    // JSON.stringify/Object.keys cannot see — a raw type-assertion cast here
    // would silently persist `{"currency":"JOD"}` (or `{}`) in place of the
    // actual amount, and every distinct input would hash identically.
    // toCanonicalJsonValue is the only path that turns these into real JSON.
    const inputsSnapshotResult = toCanonicalJsonValue(inputs)
    if (!inputsSnapshotResult.ok) {
      return err(inputsSnapshotResult.error)
    }
    const inputsSnapshot = inputsSnapshotResult.value
    const inputsHash = hashCanonicalJson(inputsSnapshot)

    let calculationOutcome: CalculationOutcome
    if (outcome.kind === 'ok') {
      const resultSnapshotResult = toCanonicalJsonValue(outcome.value)
      if (!resultSnapshotResult.ok) {
        return err(resultSnapshotResult.error)
      }
      calculationOutcome = {
        kind: 'result',
        confidence: outcome.confidence,
        resultSnapshot: resultSnapshotResult.value,
      }
    } else if (outcome.kind === 'refused') {
      let partialSnapshot: CanonicalJsonValue | undefined
      if (outcome.partial !== undefined) {
        const partialResult = toCanonicalJsonValue(outcome.partial)
        if (!partialResult.ok) {
          return err(partialResult.error)
        }
        partialSnapshot = partialResult.value
      }
      calculationOutcome = {
        kind: 'refused',
        missingFields: outcome.missing.map((m) => m.field),
        ...(partialSnapshot !== undefined ? { partialSnapshot } : {}),
      }
    } else {
      return err(
        makeError('calculationUnsupported', {
          cause: 'Unrecognized outcome from finance engine',
        }),
      )
    }

    const assumptions = outcome.kind === 'ok' ? outcome.assumptions : []

    const run: CalculationRun = {
      id: brandId<'calculationRun'>(generateId()),
      userId,
      obligationId,
      formulaId,
      formulaVersion,
      asOf,
      inputsSnapshot,
      inputsHash,
      outcome: calculationOutcome,
      assumptions,
      calculatedAt,
    }

    return this.repo.persist(run)
  }
}
