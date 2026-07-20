import {
  err,
  makeError,
  Money,
  ok,
  type AppError,
  type ConventionalLoan,
  type LocalDate,
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
    paymentsTotal: Money,
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
      paymentsTotal,
    )
  }

  calculateRecommended(
    loan: ConventionalLoan,
    ratePeriods: readonly RatePeriod[],
    asOf: LocalDate,
    paymentsTotal: Money,
  ): Result<VariableProjectionResult, AppError> {
    return this.calculateWithPolicy(
      loan,
      ratePeriods,
      loan.loanDetails.installment.value,
      { kind: 'recalculated' },
      asOf,
      paymentsTotal,
    )
  }

  /**
   * Same installment as today, but projected against the principal net of
   * everything already paid — so an overpaying customer sees the loan finish
   * sooner (engine's own early-payoff detection under `unchanged`) rather
   * than a schedule that ignores their payments entirely.
   */
  calculateSameInstallment(
    loan: ConventionalLoan,
    ratePeriods: readonly RatePeriod[],
    asOf: LocalDate,
    paymentsTotal: Money,
  ): Result<VariableProjectionResult, AppError> {
    return this.calculateWithPolicy(
      loan,
      ratePeriods,
      loan.loanDetails.installment.value,
      { kind: 'unchanged' },
      asOf,
      paymentsTotal,
    )
  }

  private calculateWithPolicy(
    loan: ConventionalLoan,
    ratePeriods: readonly RatePeriod[],
    installment: Money,
    installmentPolicy: InstallmentPolicy,
    asOf: LocalDate,
    paymentsTotal: Money,
  ): Result<VariableProjectionResult, AppError> {
    const formula = resolveFormula('variableProjection', 1)
    if (!formula.ok) return formula
    const principal = loan.loanDetails.originalPrincipal.value.subtract(paymentsTotal)
    const outcome = formula.value.execute({
      principal: principal.isNegative() ? Money.zero(principal.currency) : principal,
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
