/**
 * SCR-DATA-STATUS view model (provider-abstraction.md §3a/§4).
 *
 * `ManualEntryProvider` is specified as a read-only adapter over the
 * repositories purely for this screen's counts/last-updated display — it is
 * never run through ImportService (manual writes go straight to
 * repositories with userEntered provenance, see §3a). Since this screen is
 * its only consumer, the counts are read directly from the repositories
 * here rather than standing up a separate provider-shaped adapter type.
 */
import { useMemo } from 'react'
import type { Id } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { useObligations } from '@/features/home/api/use-obligations'
import { usePaymentsByObligation } from '@/features/home/api/use-payments-by-obligation'

export interface DataStatusViewModel {
  status: 'loading' | 'error' | 'success'
  /** Which of the two active-source labels applies — demo/manual are mutually exclusive by dataMode. */
  activeSource: 'demo-seed' | 'manual'
  obligationCount: number
  paymentCount: number
  /** Most recent obligation.updatedAt / payment.createdAt across all records, or undefined if none exist. */
  lastUpdated: string | undefined
}

export function useDataStatusViewModel(): DataStatusViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const isDemo = typeof repos.reset === 'function'

  const {
    data: obligations,
    isLoading: obligationsLoading,
    isError,
  } = useObligations(repos.obligationRepository, activeUser ?? ('' as Id<'user'>))
  const { data: paymentsByObligation, isLoading: paymentsLoading } = usePaymentsByObligation(
    repos.paymentRepository,
    obligations ?? [],
  )

  return useMemo((): DataStatusViewModel => {
    const activeSource: 'demo-seed' | 'manual' = isDemo ? 'demo-seed' : 'manual'

    if (isError) {
      return {
        status: 'error',
        activeSource,
        obligationCount: 0,
        paymentCount: 0,
        lastUpdated: undefined,
      }
    }
    if (!activeUser || obligationsLoading || paymentsLoading || !obligations) {
      return {
        status: 'loading',
        activeSource,
        obligationCount: 0,
        paymentCount: 0,
        lastUpdated: undefined,
      }
    }

    const allPayments = [...paymentsByObligation.values()].flat()
    const timestamps = [
      ...obligations.map((o) => o.updatedAt),
      ...allPayments.map((p) => p.createdAt),
    ]
    const lastUpdated = timestamps.length > 0 ? [...timestamps].sort().at(-1) : undefined

    return {
      status: 'success',
      activeSource,
      obligationCount: obligations.length,
      paymentCount: allPayments.length,
      lastUpdated,
    }
  }, [
    isDemo,
    isError,
    activeUser,
    obligationsLoading,
    paymentsLoading,
    obligations,
    paymentsByObligation,
  ])
}
