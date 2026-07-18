import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Money,
  DomainInvariantError,
  type Id,
  type CalculationRun,
  type Confidence,
} from '@eltizamati/domain'
import type { ResidualCause } from '@eltizamati/finance-engine'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { snapshotRecord, snapshotMoneyAmount, snapshotArray } from '@/services/calculation-snapshot'
import { calculationAsOf } from '@/services/calculation-as-of'
import { usePersonalCalculationAsOf } from '@/services/calculation-as-of-context'
import {
  applicableRatePeriods,
  projectedRemainingPayable,
  rateHistoryFingerprint,
} from '../projection-display'

export interface RateImpactViewModel {
  status: 'loading' | 'error' | 'unsupported' | 'refused' | 'success'
  projectionRun?: CalculationRun
  hasResidual: boolean
  residualAmount?: string
  residualConfidence?: Confidence
  residualCauses: readonly ResidualCause[]
  residualCalculationRunId?: string
  residualCalculatedAt?: string
  /** TV-305's exact figure remains PENDING-FINANCE (calculation-test-vectors.md)
   * — this estimate ships at 'medium' confidence, never 'official', and the UI
   * must label it as an estimate pending finance sign-off, never a final number. */
  addedCostAvailable: boolean
  addedCostAmount?: string
  addedCostCalculationRunId?: string
  addedCostCalculatedAt?: string
  currentRatePercent?: string
  previousRatePercent?: string
  projectedRemainingPayable?: string
}

export function useRateImpactViewModel(obligationId: Id<'obligation'>): RateImpactViewModel {
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

  const canRunProjection = !!activeUser && obligation?.kind === 'conventionalLoan' && !!ratePeriods
  const asOf = calculationAsOf(
    typeof repos.reset === 'function' ? 'demo' : 'personal',
    personalAsOf,
  )
  const rateFingerprint = rateHistoryFingerprint(ratePeriods)

  const { data: projectionRun, isError: isProjError } = useQuery({
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

  const residualAmountFromProjection =
    projectionRun?.outcome.kind === 'result'
      ? snapshotMoneyAmount(
          snapshotRecord(projectionRun.outcome.resultSnapshot).projectedResidualAtMaturity,
        )
      : undefined
  const projectionSnapshot =
    projectionRun?.outcome.kind === 'result'
      ? snapshotRecord(projectionRun.outcome.resultSnapshot)
      : undefined
  const remainingPayable =
    projectionSnapshot !== undefined && obligation?.kind === 'conventionalLoan'
      ? projectedRemainingPayable(projectionSnapshot, obligation.currency, asOf)
      : undefined
  const applicableRates = applicableRatePeriods(ratePeriods, asOf)

  // BR-CALC-012/013: residualDetection reports *why* a residual exists
  // (contractual balloon vs a rate-increase-driven detection) instead of a
  // bare yes/no. Evidence is only ever built from data this MVP actually
  // has — `ConventionalLoanDetails` has no balloon field, so
  // `contractualBalloon` evidence is always absent here (never fabricated);
  // `rateIncreasedWithUnchangedInstallment` is derivable because the MVP
  // always projects under the `unchanged` installment policy (see above).
  const rateIncreasedWithUnchangedInstallment =
    ratePeriods !== undefined && ratePeriods.length > 1
      ? [...ratePeriods].slice(1).some((rp, i) => {
          const previous = ratePeriods[i]
          return (
            previous !== undefined &&
            rp.annualRate.toDecimal().greaterThan(previous.annualRate.toDecimal())
          )
        })
      : false

  const canRunResidualDetection =
    !!activeUser &&
    obligation?.kind === 'conventionalLoan' &&
    residualAmountFromProjection !== undefined

  const { data: residualRun, isError: isResidualError } = useQuery({
    queryKey: ['residualDetection', obligationId, activeUser, residualAmountFromProjection, asOf],
    queryFn: async (): Promise<CalculationRun> => {
      if (
        !activeUser ||
        obligation?.kind !== 'conventionalLoan' ||
        residualAmountFromProjection === undefined
      ) {
        throw new DomainInvariantError(
          'unexpected',
          'residualDetection query ran while enabled gate was false',
        )
      }
      const result = await calcService.runCalculation(
        activeUser,
        obligationId,
        'residualDetection',
        1,
        {
          projectedResidualAtMaturity: Money.of(residualAmountFromProjection, obligation.currency),
          originalPrincipal: obligation.loanDetails.originalPrincipal.value,
          currentInstallment: obligation.loanDetails.installment.value,
          evidence: { rateIncreasedWithUnchangedInstallment },
          asOf,
        },
        asOf,
      )

      if (!result.ok) throw result.error
      return result.value
    },
    enabled: canRunResidualDetection,
  })

  const canRunAddedCost =
    !!activeUser && obligation?.kind === 'conventionalLoan' && !!ratePeriods

  const { data: addedCostRun, isError: isAddedCostError } = useQuery({
    queryKey: ['addedCostFromRepricing', obligationId, activeUser, asOf, rateFingerprint],
    queryFn: async (): Promise<CalculationRun> => {
      if (!activeUser || obligation?.kind !== 'conventionalLoan' || !ratePeriods) {
        throw new DomainInvariantError(
          'unexpected',
          'addedCostFromRepricing query ran while enabled gate was false',
        )
      }
      const result = await calcService.runCalculation(
        activeUser,
        obligationId,
        'addedCostFromRepricing',
        1,
        {
          principal: obligation.loanDetails.originalPrincipal.value,
          ratePeriods,
          termMonths: obligation.loanDetails.termMonths.value,
          startDate: obligation.loanDetails.startDate,
          installment: obligation.loanDetails.installment.value,
          asOf,
        },
        asOf,
      )

      if (!result.ok) throw result.error
      return result.value
    },
    enabled: canRunAddedCost,
  })

  const addedCostSnapshot =
    addedCostRun?.outcome.kind === 'result' ? snapshotRecord(addedCostRun.outcome.resultSnapshot) : undefined
  const addedCostAmount = snapshotMoneyAmount(addedCostSnapshot?.addedTotalCost)

  if (isOblError || isProjError || isResidualError || isAddedCostError) {
    return { status: 'error', hasResidual: false, residualCauses: [], addedCostAvailable: false }
  }

  if (!obligation) {
    return { status: 'loading', hasResidual: false, residualCauses: [], addedCostAvailable: false }
  }

  if (obligation.kind !== 'conventionalLoan') {
    return {
      status: 'unsupported',
      hasResidual: false,
      residualCauses: [],
      addedCostAvailable: false,
    }
  }

  if (!projectionRun) {
    return { status: 'loading', hasResidual: false, residualCauses: [], addedCostAvailable: false }
  }

  if (projectionRun.outcome.kind === 'refused') {
    return {
      status: 'refused',
      projectionRun,
      hasResidual: false,
      residualCauses: [],
      addedCostAvailable: false,
    }
  }

  const hasResidual =
    residualAmountFromProjection !== undefined &&
    Money.of(residualAmountFromProjection, obligation.currency).isPositive()

  if (hasResidual && !residualRun) {
    return {
      status: 'loading',
      projectionRun,
      hasResidual,
      residualAmount: residualAmountFromProjection,
      residualCauses: [],
      addedCostAvailable: false,
    }
  }

  const residualSnapshot =
    residualRun?.outcome.kind === 'result'
      ? snapshotRecord(residualRun.outcome.resultSnapshot)
      : undefined
  const residualCauses =
    (snapshotArray(residualSnapshot?.causes).filter(
      (c) => typeof c === 'string',
    ) as ResidualCause[]) ?? []

  return {
    status: 'success',
    projectionRun,
    hasResidual,
    residualAmount: residualAmountFromProjection,
    residualConfidence:
      residualRun?.outcome.kind === 'result' ? residualRun.outcome.confidence : undefined,
    residualCauses,
    residualCalculationRunId: residualRun?.id,
    residualCalculatedAt: residualRun?.calculatedAt,
    addedCostAvailable: addedCostAmount !== undefined,
    addedCostAmount,
    addedCostCalculationRunId: addedCostRun?.id,
    addedCostCalculatedAt: addedCostRun?.calculatedAt,
    currentRatePercent: applicableRates[0]?.annualRate.toPercent().toFixed(3),
    previousRatePercent: applicableRates[1]?.annualRate.toPercent().toFixed(3),
    projectedRemainingPayable: remainingPayable?.toStorageString(),
  }
}
