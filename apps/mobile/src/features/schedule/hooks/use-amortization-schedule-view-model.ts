import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DomainInvariantError, Money, type Id, type CalculationRun } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { snapshotRecord, snapshotArray, snapshotMoneyAmount } from '@/services/calculation-snapshot'
import { calculationAsOf } from '@/services/calculation-as-of'
import { usePersonalCalculationAsOf } from '@/services/calculation-as-of-context'
import {
  applicableRatePeriods,
  projectedRemainingPayable,
  rateHistoryFingerprint,
} from '@/features/rate-impact/projection-display'

/**
 * Display row for one amortization period. `CalculationRun.resultSnapshot` is
 * opaque canonical JSON (finance-engine's `ScheduleEntry` — with real `Money`
 * instances — never survives the round trip), so this is the JSON-safe shape
 * screens actually receive: decimal strings, not `Money`.
 */
export interface AmortizationScheduleRow {
  period: number
  date: string
  payment: string
  principal: string
  cost: string
  closingBalance: string
  /** % change in the interest/cost portion vs. the previous period; undefined for period 1 or when either amount is unknown. */
  costPercentChangeFromPrevious: number | undefined
  finalBalloonAmount?: string
  finalBalloonKind?: 'agreed' | 'projected'
}

export interface AmortizationScheduleViewModel {
  status: 'loading' | 'error' | 'unsupported' | 'refused' | 'success'
  schedule: AmortizationScheduleRow[]
  run?: CalculationRun
  currentRatePercent?: string
  previousRatePercent?: string
  projectedRemainingPayable?: string
  projectedResidualAtMaturity?: string
  approvedAgreementAt?: string
}

export function useAmortizationScheduleViewModel(
  obligationId: Id<'obligation'>,
): AmortizationScheduleViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const personalAsOf = usePersonalCalculationAsOf()

  const calcService = useMemo(
    () => new CalculationService(repos.calculationRunRepository),
    [repos.calculationRunRepository],
  )

  const { data: obligation, isError: isOblError } = useQuery({
    queryKey: ['obligation', activeUser ?? '', obligationId],
    queryFn: async () => {
      const res = await repos.obligationRepository.get(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  const { data: ratePeriods } = useQuery({
    queryKey: ['ratePeriods', activeUser ?? '', obligationId],
    queryFn: async () => {
      const res = await repos.ratePeriodRepository.historyFor(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
    enabled: !!obligation,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: proposals, isError: isProposalError } = useQuery({
    queryKey: ['loanScheduleProposals', activeUser ?? '', obligationId],
    queryFn: async () => {
      if (!activeUser) throw new DomainInvariantError('unexpected', 'No active user')
      const result = await repos.loanScheduleProposalRepository.listFor(activeUser, obligationId)
      if (!result.ok) throw result.error
      return result.value
    },
    enabled: !!activeUser && obligation?.kind === 'conventionalLoan',
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const canRunProjection = !!activeUser && obligation?.kind === 'conventionalLoan' && !!ratePeriods
  const asOf = calculationAsOf(
    typeof repos.reset === 'function' ? 'demo' : 'personal',
    personalAsOf,
  )
  const rateFingerprint = rateHistoryFingerprint(ratePeriods)

  const { data: run, isError: isProjError } = useQuery({
    queryKey: ['projection', obligationId, activeUser, asOf, rateFingerprint],
    queryFn: async (): Promise<CalculationRun> => {
      if (!activeUser || obligation?.kind !== 'conventionalLoan' || !ratePeriods) {
        throw new DomainInvariantError(
          'unexpected',
          'projection query ran while enabled gate was false',
        )
      }
      const result = await calcService.runCalculation(
        activeUser,
        obligationId,
        'variableProjection',
        1,
        {
          principal: obligation.loanDetails.originalPrincipal.value,
          ratePeriods,
          termMonths: obligation.loanDetails.termMonths.value,
          startDate: obligation.loanDetails.startDate,
          installment: obligation.loanDetails.installment.value,
          installmentPolicy: { kind: 'unchanged' }, // MVP assumption
          asOf,
        },
        asOf,
      )

      if (!result.ok) throw result.error
      return result.value
    },
    enabled: canRunProjection,
  })

  if (isOblError || isProjError || isProposalError) {
    return { status: 'error', schedule: [] }
  }

  if (!obligation) {
    return { status: 'loading', schedule: [] }
  }

  if (obligation.kind !== 'conventionalLoan') {
    return { status: 'unsupported', schedule: [] }
  }

  const approvedAgreement = proposals?.find((proposal) => proposal.status === 'approved')
  if (approvedAgreement !== undefined) {
    let previousCost: number | undefined
    const schedule = approvedAgreement.schedule.map((entry) => {
      const currentCost = Number(entry.cost)
      const costPercentChangeFromPrevious =
        !Number.isFinite(currentCost) || previousCost === undefined || previousCost === 0
          ? undefined
          : ((currentCost - previousCost) / previousCost) * 100
      previousCost = Number.isFinite(currentCost) ? currentCost : undefined
      return {
        period: entry.period,
        date: entry.date,
        payment: entry.payment,
        principal: entry.principal,
        cost: entry.cost,
        closingBalance: entry.closingBalance,
        costPercentChangeFromPrevious,
        ...(entry.finalBalloonAmount === undefined
          ? {}
          : { finalBalloonAmount: entry.finalBalloonAmount, finalBalloonKind: 'agreed' as const }),
      }
    })
    const rates = [...approvedAgreement.rateHistorySnapshot].sort((a, b) =>
      a.effectiveFrom < b.effectiveFrom ? 1 : -1,
    )
    return {
      status: 'success',
      schedule,
      currentRatePercent:
        rates[0] === undefined ? undefined : String(Number(rates[0].annualRate) * 100),
      previousRatePercent:
        rates[1] === undefined ? undefined : String(Number(rates[1].annualRate) * 100),
      projectedRemainingPayable: approvedAgreement.projectedRemainingPayable,
      projectedResidualAtMaturity: approvedAgreement.finalBalloon,
      approvedAgreementAt: approvedAgreement.decidedAt ?? approvedAgreement.updatedAt,
    }
  }

  if (!run) {
    return { status: 'loading', schedule: [] }
  }

  if (run.outcome.kind === 'refused') {
    return { status: 'refused', schedule: [], run }
  }

  const snapshot = snapshotRecord(run.outcome.resultSnapshot)
  const applicableRates = applicableRatePeriods(ratePeriods, asOf)
  const remainingPayable = projectedRemainingPayable(snapshot, obligation.currency, asOf)
  const residual = snapshotMoneyAmount(snapshot.projectedResidualAtMaturity)
  let previousCost: number | undefined
  let schedule = snapshotArray(snapshot.schedule)
    .map((entryValue, index) => ({ entry: snapshotRecord(entryValue), index }))
    .filter(({ entry }) => typeof entry.date === 'string' && entry.date > asOf)
    .map(({ entry, index }) => {
      const cost = snapshotMoneyAmount(entry.cost) ?? '?'
      const currentCost = cost === '?' ? undefined : Number(cost)
      const costPercentChangeFromPrevious =
        currentCost === undefined || previousCost === undefined || previousCost === 0
          ? undefined
          : ((currentCost - previousCost) / previousCost) * 100
      previousCost = currentCost
      return {
        period: typeof entry.period === 'number' ? entry.period : index + 1,
        date: typeof entry.date === 'string' ? entry.date : '',
        payment: snapshotMoneyAmount(entry.payment) ?? '?',
        principal: snapshotMoneyAmount(entry.principal) ?? '?',
        cost,
        closingBalance: snapshotMoneyAmount(entry.closingBalance) ?? '?',
        costPercentChangeFromPrevious,
      }
    })

  const contractualBalloon = obligation.loanDetails.contractualBalloon?.value
  const finalBalloon =
    contractualBalloon ??
    (residual === undefined ? undefined : Money.of(residual, obligation.currency))
  if (finalBalloon?.isPositive() === true && schedule.length > 0) {
    const finalIndex = schedule.length - 1
    schedule = schedule.map((entry, index) =>
      index === finalIndex
        ? {
            ...entry,
            finalBalloonAmount: finalBalloon.toStorageString(),
            finalBalloonKind: contractualBalloon === undefined ? 'projected' : 'agreed',
          }
        : entry,
    )
  }

  return {
    status: 'success',
    schedule,
    run,
    currentRatePercent: applicableRates[0]?.annualRate.toPercent().toFixed(3),
    previousRatePercent: applicableRates[1]?.annualRate.toPercent().toFixed(3),
    projectedRemainingPayable: remainingPayable?.toStorageString(),
    projectedResidualAtMaturity: residual,
  }
}
