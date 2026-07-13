import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Money, type Id, type Obligation, type Payment, type Confidence } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { calculationAsOf } from '@/services/calculation-as-of'
import {
  snapshotRecord,
  snapshotMoneyAmount,
  snapshotPercent,
} from '@/services/calculation-snapshot'

export interface MurabahaProgressModel {
  outstanding: string
  paidToDate: string
  progressPercent: number
  status: 'inProgress' | 'completed'
  confidence: Confidence
  calculationRunId: string
}

export interface MurabahaDetailViewModel {
  status: 'loading' | 'error' | 'success'
  obligation?: Obligation
  payments?: readonly Payment[]
  progress?: MurabahaProgressModel
}

export function useMurabahaDetailViewModel(
  obligationId: Id<'obligation'>,
): MurabahaDetailViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()

  const calcService = useMemo(
    () => new CalculationService(repos.calculationRunRepository),
    [repos.calculationRunRepository],
  )

  const { data: obligation, isError: isObligationError } = useQuery({
    queryKey: ['obligation', obligationId],
    queryFn: async () => {
      const res = await repos.obligationRepository.get(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  const { data: payments } = useQuery({
    queryKey: ['payments', obligationId],
    queryFn: async () => {
      const res = await repos.paymentRepository.listFor(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
    enabled: !!obligation,
  })

  const { data: progressRun } = useQuery({
    queryKey: ['murabahaProgress', obligationId, activeUser, payments?.length],
    queryFn: async () => {
      if (!activeUser || !obligation || obligation.kind !== 'murabaha' || !payments) return null
      const currency = obligation.murabahaDetails.totalSalePrice.value.currency
      const paymentsTotal = payments.reduce(
        (sum, payment) => sum.add(payment.amount),
        Money.zero(currency),
      )
      const asOf = calculationAsOf(obligation)
      const result = await calcService.runCalculation(
        activeUser,
        obligationId,
        'murabahaProgress',
        1,
        {
          totalSalePrice: obligation.murabahaDetails.totalSalePrice.value,
          paymentsTotal,
          asOf,
        },
        asOf,
      )
      if (!result.ok) throw result.error
      return result.value
    },
    enabled: !!activeUser && !!obligation && obligation.kind === 'murabaha' && !!payments,
  })

  if (isObligationError) {
    return { status: 'error' }
  }

  if (!obligation) {
    return { status: 'loading' }
  }

  let progress: MurabahaProgressModel | undefined
  if (progressRun && progressRun.outcome.kind === 'result') {
    const snapshot = snapshotRecord(progressRun.outcome.resultSnapshot)
    const outstanding = snapshotMoneyAmount(snapshot.outstanding)
    const paidToDate = snapshotMoneyAmount(snapshot.paidToDate)
    const progressPercentStr = snapshotPercent(snapshot.progress)
    const status = snapshot.status === 'completed' ? 'completed' : 'inProgress'
    if (outstanding !== undefined && paidToDate !== undefined && progressPercentStr !== undefined) {
      progress = {
        outstanding,
        paidToDate,
        progressPercent: Number(progressPercentStr),
        status,
        confidence: progressRun.outcome.confidence,
        calculationRunId: progressRun.id,
      }
    }
  }

  return {
    status: 'success',
    obligation,
    payments,
    progress,
  }
}
