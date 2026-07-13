import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Money, type CalculationRun, type Id } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { calculationAsOf } from '@/services/calculation-as-of'
import { isValidDecimal } from '@/features/obligation-form/validation'

export function useCardPayoffSimulator(obligationId: Id<'obligation'>) {
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const service = useMemo(
    () => new CalculationService(repos.calculationRunRepository),
    [repos.calculationRunRepository],
  )
  const [paymentAmount, setPaymentAmount] = useState('100')
  const [run, setRun] = useState<CalculationRun | undefined>()
  const [status, setStatus] = useState<
    'idle' | 'calculating' | 'success' | 'refused' | 'invalid' | 'error'
  >('idle')

  const obligationQuery = useQuery({
    queryKey: ['obligation', obligationId],
    queryFn: async () => {
      const result = await repos.obligationRepository.get(obligationId)
      if (!result.ok) throw result.error
      return result.value
    },
  })

  async function calculate() {
    const obligation = obligationQuery.data
    if (!activeUser || obligation?.kind !== 'creditCard') return
    const trimmedPayment = paymentAmount.trim()
    if (
      trimmedPayment !== '' &&
      (!isValidDecimal(trimmedPayment) ||
        !Money.of(trimmedPayment, obligation.currency).isPositive())
    ) {
      setStatus('invalid')
      return
    }
    const { currentBalance, purchaseApr, minimumPaymentRule } = obligation.cardDetails
    setStatus('calculating')
    const result = await service.runCalculation(
      activeUser,
      obligation.id,
      'cardPayoff',
      1,
      {
        balance: currentBalance.value,
        annualRate: purchaseApr?.value,
        minimumPaymentRule,
        ...(trimmedPayment === ''
          ? {}
          : { fixedPaymentAmount: Money.of(trimmedPayment, obligation.currency) }),
        asOf: calculationAsOf(obligation),
      },
      calculationAsOf(obligation),
    )
    if (!result.ok) {
      setStatus('error')
      return
    }
    setRun(result.value)
    setStatus(result.value.outcome.kind === 'refused' ? 'refused' : 'success')
  }

  return {
    obligation: obligationQuery.data,
    loading: obligationQuery.isLoading,
    loadError: obligationQuery.isError,
    paymentAmount,
    setPaymentAmount,
    run,
    status,
    calculate,
  }
}
