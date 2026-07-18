import {
  err,
  makeError,
  ok,
  type AppError,
  type ConventionalLoan,
  type LocalDate,
  type Rate,
  type Result,
} from '@eltizamati/domain'
import { resolveFormula, type RateChangeScenarioResult } from '@eltizamati/finance-engine'

/** Executes a rate comparison without touching repositories or persisted calculation runs. */
export class RateWhatIfService {
  calculate(
    loan: ConventionalLoan,
    hypotheticalAnnualRate: Rate,
    hypotheticalEffectiveDate: LocalDate,
    asOf: LocalDate,
  ): Result<RateChangeScenarioResult, AppError> {
    const formula = resolveFormula('rateChangeScenario', 1)
    if (!formula.ok) return formula
    const outcome = formula.value.execute({
      principal: loan.loanDetails.originalPrincipal.value,
      ratePeriods: loan.loanDetails.ratePeriods,
      termMonths: loan.loanDetails.termMonths.value,
      startDate: loan.loanDetails.startDate,
      installment: loan.loanDetails.installment.value,
      hypotheticalAnnualRate,
      hypotheticalEffectiveDate,
      asOf,
    })
    if (outcome.kind === 'refused') {
      return err(
        makeError('calculationRefused', {
          safeMetadata: {
            fields: outcome.missing.map((x) => x.field).join(','),
            reason: outcome.missing[0]?.reason ?? '',
          },
        }),
      )
    }
    return ok(outcome.value)
  }
}
