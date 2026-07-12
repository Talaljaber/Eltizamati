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
import { DEMO_DATE } from '@eltizamati/demo-data'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { snapshotRecord, snapshotMoneyAmount, snapshotArray } from '@/services/calculation-snapshot'

export interface RateImpactViewModel {
  status: 'loading' | 'error' | 'unsupported' | 'refused' | 'success'
  projectionRun?: CalculationRun
  hasResidual: boolean
  residualAmount?: string
  residualConfidence?: Confidence
  residualCauses: readonly ResidualCause[]
  residualCalculationRunId?: string
  /** TV-305 (added total cost from repricing) is PENDING-FINANCE — no signed
   * formula output exists yet, so this stays false until finance sign-off
   * lands; the UI must show an honest "pending" state, never a fabricated
   * number (AI_AGENT_RULES). */
  addedCostAvailable: boolean
}

export function useRateImpactViewModel(obligationId: Id<'obligation'>): RateImpactViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()

  const calcService = useMemo(
    () => new CalculationService(repos.calculationRunRepository),
    [repos.calculationRunRepository],
  )

  const { data: obligation, isError: isOblError } = useQuery({
    queryKey: ['obligation', obligationId],
    queryFn: async () => {
      const res = await repos.obligationRepository.get(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  const { data: ratePeriods } = useQuery({
    queryKey: ['ratePeriods', obligationId],
    queryFn: async () => {
      const res = await repos.ratePeriodRepository.historyFor(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
    enabled: !!obligation,
  })

  const canRunProjection = !!activeUser && obligation?.kind === 'conventionalLoan' && !!ratePeriods

  const { data: projectionRun, isError: isProjError } = useQuery({
    queryKey: ['projection', obligationId, activeUser],
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
          asOf: DEMO_DATE,
        },
        DEMO_DATE,
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
    queryKey: ['residualDetection', obligationId, activeUser, residualAmountFromProjection],
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
          asOf: DEMO_DATE,
        },
        DEMO_DATE,
      )

      if (!result.ok) throw result.error
      return result.value
    },
    enabled: canRunResidualDetection,
  })

  if (isOblError || isProjError || isResidualError) {
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
    addedCostAvailable: false,
  }
}
