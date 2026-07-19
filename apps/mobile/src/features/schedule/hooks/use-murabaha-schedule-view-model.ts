import { useQuery } from '@tanstack/react-query'
import {
  addMonthsToLocalDate,
  type Money,
  type Id,
  type LocalDate,
  type Provenance,
} from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'

/**
 * One row of the Murabaha payment schedule.
 *
 * A Murabaha schedule is NOT an amortization: the sale price and installments
 * are fixed at signing and never change (BR-CALC-020, ASM-010), so there is no
 * principal/profit split to impute per period — doing so would require an
 * imputed rate the spec forbids. Each period simply pays the fixed installment
 * and the outstanding financing drops by that amount.
 */
export interface MurabahaScheduleRow {
  readonly period: number
  readonly date: LocalDate
  readonly installment: Money
  readonly remainingFinancing: Money
  /** True when this installment differs from the standard one — i.e. the final
   * installment adjusted to clear the exact agreed sale price. */
  readonly isFinalAdjusted: boolean
}

export interface MurabahaScheduleViewModel {
  readonly status: 'loading' | 'notApplicable' | 'error' | 'success'
  readonly rows: readonly MurabahaScheduleRow[]
  readonly totalSalePrice?: Money
  readonly standardInstallment?: Money
  readonly termMonths?: number
  /** Provenance of the fixed contractual installment (official / user-entered). */
  readonly installmentProvenance?: Provenance
  /** True when the last installment had to adjust to clear the sale price exactly. */
  readonly hasAdjustedFinalInstallment: boolean
}

/**
 * Builds the fixed Murabaha installment schedule by pure subtraction only
 * (INV-7: Σinstallments = totalSalePrice exactly, no rounding drift). The final
 * scheduled installment pays whatever remains so the outstanding clears to zero
 * against the exact agreed sale price, even if `installment × term` does not
 * land precisely on `totalSalePrice`.
 */
export function buildMurabahaSchedule(
  totalSalePrice: Money,
  installment: Money,
  termMonths: number,
  startDate: LocalDate,
): MurabahaScheduleRow[] {
  const rows: MurabahaScheduleRow[] = []
  let remaining = totalSalePrice

  for (let period = 1; period <= termMonths; period += 1) {
    if (!remaining.isPositive()) break
    const isLastPeriod = period === termMonths
    // Standard installment every period, except pay only what's left when the
    // installment would overshoot (final period, or an over-funded contract).
    const payment = isLastPeriod || !installment.isLessThan(remaining) ? remaining : installment
    remaining = remaining.subtract(payment)
    rows.push({
      period,
      date: addMonthsToLocalDate(startDate, period),
      installment: payment,
      remainingFinancing: remaining,
      isFinalAdjusted: !payment.equals(installment),
    })
  }

  return rows
}

export function useMurabahaScheduleViewModel(
  obligationId: Id<'obligation'>,
): MurabahaScheduleViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()

  const { data: obligation, isError } = useQuery({
    queryKey: ['obligation', activeUser ?? '', obligationId],
    queryFn: async () => {
      const res = await repos.obligationRepository.get(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  if (isError) return { status: 'error', rows: [], hasAdjustedFinalInstallment: false }
  if (!obligation) return { status: 'loading', rows: [], hasAdjustedFinalInstallment: false }
  if (obligation.kind !== 'murabaha') {
    return { status: 'notApplicable', rows: [], hasAdjustedFinalInstallment: false }
  }

  const details = obligation.murabahaDetails
  const rows = buildMurabahaSchedule(
    details.totalSalePrice.value,
    details.installment.value,
    details.termMonths.value,
    details.startDate,
  )

  return {
    status: 'success',
    rows,
    totalSalePrice: details.totalSalePrice.value,
    standardInstallment: details.installment.value,
    termMonths: details.termMonths.value,
    installmentProvenance: details.installment.provenance,
    hasAdjustedFinalInstallment: rows.some((row) => row.isFinalAdjusted),
  }
}
