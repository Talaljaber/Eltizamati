import {
  err,
  makeError,
  ok,
  type AppError,
  type ConventionalLoan,
  type LocalDate,
  type Money,
  type RatePeriod,
  type Result,
} from '@eltizamati/domain'
import { resolveFormula, type VariableProjectionResult } from '@eltizamati/finance-engine'
import type { InstallmentPolicy } from '@eltizamati/finance-engine'

/** Pure proposal calculation. It never receives repositories and cannot persist loan changes. */
export class ScheduleProposalService {
  calculate(
    loan: ConventionalLoan,
    ratePeriods: readonly RatePeriod[],
    proposedInstallment: Money,
    asOf: LocalDate,
  ): Result<VariableProjectionResult, AppError> {
    if (!proposedInstallment.isPositive()) {
      return err(makeError('validation', { safeMetadata: { field: 'proposedInstallment' } }))
    }

    return this.calculateWithPolicy(
      loan,
      ratePeriods,
      proposedInstallment,
      { kind: 'unchanged' },
      asOf,
    )
  }

  calculateRecommended(
    loan: ConventionalLoan,
    ratePeriods: readonly RatePeriod[],
    asOf: LocalDate,
  ): Result<VariableProjectionResult, AppError> {
    return this.calculateWithPolicy(
      loan,
      ratePeriods,
      loan.loanDetails.installment.value,
      { kind: 'recalculated' },
      asOf,
    )
  }

  private calculateWithPolicy(
    loan: ConventionalLoan,
    ratePeriods: readonly RatePeriod[],
    installment: Money,
    installmentPolicy: InstallmentPolicy,
    asOf: LocalDate,
  ): Result<VariableProjectionResult, AppError> {
    const formula = resolveFormula('variableProjection', 1)
    if (!formula.ok) return formula
    const outcome = formula.value.execute({
      principal: loan.loanDetails.originalPrincipal.value,
      ratePeriods,
      termMonths: loan.loanDetails.termMonths.value,
      startDate: loan.loanDetails.startDate,
      installment,
      installmentPolicy,
      asOf,
    })

    if (outcome.kind === 'refused') {
      return err(
        makeError('calculationRefused', {
          safeMetadata: { fields: outcome.missing.map((field) => field.field).join(',') },
        }),
      )
    }
    return ok(outcome.value)
  }
}
