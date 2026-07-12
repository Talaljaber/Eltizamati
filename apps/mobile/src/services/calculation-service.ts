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
import { hashCanonicalJson, brandId, err, makeError } from '@eltizamati/domain'
import { resolveFormula, type FormulaId, type FormulaVersion } from '@eltizamati/finance-engine'

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
  async runCalculation<TInputs>(
    userId: Id<'user'>,
    obligationId: Id<'obligation'> | undefined,
    formulaId: FormulaId,
    formulaVersion: FormulaVersion,
    inputs: TInputs,
    asOf: LocalDate,
    calculatedAt: string = new Date().toISOString(),
  ): Promise<Result<CalculationRun, AppError>> {
    const registryResult = resolveFormula(formulaId, formulaVersion)
    if (!registryResult.ok) {
      return err(registryResult.error)
    }
    const formulaMeta = registryResult.value
    const outcome = formulaMeta.execute(inputs)

    const inputsSnapshot = inputs as unknown as CanonicalJsonValue
    const inputsHash = hashCanonicalJson(inputsSnapshot)

    let calculationOutcome: CalculationOutcome
    if (outcome.kind === 'ok') {
      calculationOutcome = {
        kind: 'result',
        confidence: outcome.confidence,
        resultSnapshot: outcome.value as unknown as CanonicalJsonValue,
      }
    } else if (outcome.kind === 'refused') {
      calculationOutcome = {
        kind: 'refused',
        missingFields: outcome.missing.map((m) => m.field),
        partialSnapshot: outcome.partial as unknown as CanonicalJsonValue,
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
