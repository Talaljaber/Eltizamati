import { useQuery } from '@tanstack/react-query'
import type { Id, RatePeriod } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'

export interface RateHistoryViewModel {
  status: 'loading' | 'error' | 'success'
  periods: RatePeriod[]
}

export function useRateHistoryViewModel(obligationId: Id<'obligation'>): RateHistoryViewModel {
  const repos = useRepositories()

  const { data: periods, isError } = useQuery({
    queryKey: ['ratePeriods', obligationId],
    queryFn: async () => {
      const res = await repos.ratePeriodRepository.historyFor(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  if (isError) {
    return { status: 'error', periods: [] }
  }

  if (!periods) {
    return { status: 'loading', periods: [] }
  }

  // Sort periods by effectiveFrom descending (newest first)
  const sorted = [...periods].sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime(),
  )

  return {
    status: 'success',
    periods: sorted,
  }
}
