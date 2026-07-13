import { useQuery } from '@tanstack/react-query'
import type { Id, RatePeriod } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'

export interface RateHistoryRow {
  period: RatePeriod
  /** % change vs. the immediately preceding rate period; undefined for the oldest period (nothing to compare against). */
  percentChangeFromPrevious: number | undefined
}

export interface RateHistoryViewModel {
  status: 'loading' | 'error' | 'success'
  periods: RateHistoryRow[]
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

  const rows: RateHistoryRow[] = sorted.map((period, idx) => {
    // sorted is newest-first, so the chronologically preceding period is the next entry in the array.
    const previous = sorted[idx + 1]
    if (previous === undefined) {
      return { period, percentChangeFromPrevious: undefined }
    }
    const currentPercent = period.annualRate.toPercent().toNumber()
    const previousPercent = previous.annualRate.toPercent().toNumber()
    const percentChangeFromPrevious =
      previousPercent === 0
        ? undefined
        : ((currentPercent - previousPercent) / previousPercent) * 100
    return { period, percentChangeFromPrevious }
  })

  return {
    status: 'success',
    periods: rows,
  }
}
