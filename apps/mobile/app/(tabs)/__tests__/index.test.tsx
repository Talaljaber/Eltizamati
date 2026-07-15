import React from 'react'
import { RefreshControl } from 'react-native'
import { fireEvent, render, waitFor, within } from '@testing-library/react-native'
import { makeError, Money, type AppErrorCode, type Provenance } from '@eltizamati/domain'
import HomeTab, { SummaryCard } from '../index'
import { useObligations } from '@/features/home/api/use-obligations'
import { useInsights } from '@/features/home/api/use-insights'
import { useActiveUserState } from '@/features/auth/hooks/use-active-user'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useHomeAggregates } from '@/features/home/hooks/use-home-aggregates'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'provenance.estimate'
        ? 'تقديري'
        : key === 'provenance.official'
          ? 'رسمي'
          : key === 'currency.jod'
            ? 'د.أ'
            : key,
    i18n: { language: 'ar', dir: () => 'rtl' },
  }),
}))

jest.mock('@/features/home/api/use-obligations', () => ({ useObligations: jest.fn() }))
jest.mock('@/features/home/api/use-insights', () => ({ useInsights: jest.fn() }))
jest.mock('@/features/auth/hooks/use-active-user', () => ({ useActiveUserState: jest.fn() }))
jest.mock('@/features/repositories/hooks/use-repositories', () => ({
  useRepositories: jest.fn(),
}))
jest.mock('@/features/home/hooks/use-home-aggregates', () => ({
  useHomeAggregates: jest.fn(),
}))

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}))

const official: Provenance = {
  source: 'official',
  providerId: 'bank',
  observedAt: '2026-07-13T00:00:00.000Z',
  recordedAt: '2026-07-13T00:00:00.000Z',
}

const estimate: Provenance = {
  source: 'estimate',
  sourceReference: 'next-run',
  observedAt: '2026-07-13T00:00:00.000Z',
  recordedAt: '2026-07-13T00:00:00.000Z',
}

function successfulAggregates(hasEstimatedInputs: boolean, nextProvenance = official) {
  return {
    status: 'success' as const,
    totalMonthlyCommitment: Money.of('4321.750', 'JOD'),
    hasEstimatedInputs,
    calculationRunId: 'aggregate-run',
    calculatedAt: '2026-07-13T00:00:00.000Z',
    nextDueAmount: Money.of('125.250', 'JOD'),
    nextDueAmountProvenance: nextProvenance,
    retry: jest.fn(),
  }
}

describe('Home financial rendering', () => {
  const refetchObligations = jest.fn().mockResolvedValue(undefined)
  const refetchInsights = jest.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRepositories as jest.Mock).mockReturnValue({
      obligationRepository: {},
      insightRepository: {},
      calculationRunRepository: {},
    })
    ;(useActiveUserState as jest.Mock).mockReturnValue({
      status: 'authenticated',
      userId: 'user-1',
    })
    ;(useObligations as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchObligations,
    })
    ;(useInsights as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchInsights,
    })
    ;(useHomeAggregates as jest.Mock).mockReturnValue(successfulAggregates(false))
  })

  it('keeps the engine total visibly estimated when all inputs are non-estimated', () => {
    const { getByTestId, getByText, getByLabelText } = render(
      <SummaryCard aggregates={successfulAggregates(false)} />,
    )
    expect(within(getByTestId('home-total-amount')).getByText(/≈/)).toBeTruthy()
    expect(getByText('تقديري')).toBeTruthy()
    expect(getByLabelText(/تقديري/)).toBeTruthy()
  })

  it('keeps the engine total visibly estimated when an input is estimated', () => {
    const { getByTestId } = render(<SummaryCard aggregates={successfulAggregates(true)} />)
    expect(within(getByTestId('home-total-amount')).getByText(/≈/)).toBeTruthy()
  })

  it('formats next payment from its own provenance rather than aggregate input quality', () => {
    const officialRender = render(<SummaryCard aggregates={successfulAggregates(true, official)} />)
    expect(
      within(officialRender.getByTestId('home-next-payment-amount')).queryByText(/≈/),
    ).toBeNull()
    expect(officialRender.getByLabelText(/رسمي/)).toBeTruthy()
    officialRender.unmount()

    const estimateRender = render(
      <SummaryCard aggregates={successfulAggregates(false, estimate)} />,
    )
    expect(
      within(estimateRender.getByTestId('home-next-payment-amount')).getByText(/≈/),
    ).toBeTruthy()
    expect(estimateRender.getAllByText('تقديري').length).toBeGreaterThanOrEqual(2)
  })

  it('renders material Home money only through identified Amount primitives', () => {
    const { getByTestId, queryByText } = render(
      <SummaryCard aggregates={successfulAggregates(false)} />,
    )
    expect(getByTestId('home-total-amount')).toBeTruthy()
    expect(getByTestId('home-next-payment-amount')).toBeTruthy()
    expect(queryByText('4321.750')).toBeNull()
    expect(queryByText('125.250')).toBeNull()
  })

  it('exposes the Arabic estimate distinction through text and accessibility, not color alone', () => {
    const { getByText, getByLabelText } = render(
      <SummaryCard aggregates={successfulAggregates(false)} />,
    )
    expect(getByText('تقديري')).toBeTruthy()
    expect(getByLabelText(/≈.*تقديري/)).toBeTruthy()
  })

  it('renders a refused calculation safely as pending', () => {
    const { getAllByText } = render(
      <SummaryCard
        aggregates={{
          status: 'success',
          nextDueAmount: Money.of('125.250', 'JOD'),
          nextDueAmountProvenance: official,
          retry: jest.fn(),
        }}
      />,
    )
    expect(getAllByText('home.totalPending').length).toBeGreaterThanOrEqual(1)
  })

  it('keeps the Home loading state safe', () => {
    ;(useActiveUserState as jest.Mock).mockReturnValue({ status: 'loading', userId: null })
    ;(useObligations as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
      refetch: jest.fn(),
    })
    ;(useInsights as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
      refetch: jest.fn(),
    })
    ;(useHomeAggregates as jest.Mock).mockReturnValue({ status: 'loading', retry: jest.fn() })
    expect(() => render(<HomeTab />)).not.toThrow()
  })

  it('does not show pull-to-refresh UI for a shared background fetch', () => {
    ;(useObligations as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: true,
      error: null,
      refetch: refetchObligations,
    })
    ;(useInsights as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: true,
      error: null,
      refetch: refetchInsights,
    })
    ;(useHomeAggregates as jest.Mock).mockReturnValue({ status: 'success', retry: jest.fn() })

    expect(render(<HomeTab />).UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false)
  })

  it.each<[AppErrorCode, string]>([
    ['connectivity', 'error.offlineTitle'],
    ['providerUnavailable', 'error.providerUnavailable'],
    ['authorization', 'error.authorization'],
    ['unexpected', 'error.unexpected'],
  ])('keeps %s query failures distinguishable from successful empty data', (code, messageKey) => {
    ;(useObligations as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: makeError(code),
      refetch: refetchObligations,
    })

    const { getByTestId, getByText, queryByTestId } = render(<HomeTab />)
    expect(getByTestId('home-query-error')).toBeTruthy()
    expect(getByText(messageKey)).toBeTruthy()
    expect(queryByTestId('home-demo-banner')).toBeNull()
  })

  it('retries failed personal queries', async () => {
    ;(useObligations as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: makeError('connectivity'),
      refetch: refetchObligations,
    })

    const { getByText } = render(<HomeTab />)
    fireEvent.press(getByText('common.retry'))

    await waitFor(() => expect(refetchObligations).toHaveBeenCalledTimes(1))
    expect(refetchInsights).toHaveBeenCalledTimes(1)
  })

  it('renders successful empty data without an error or stale-data label', () => {
    const { getByText, queryByTestId } = render(<HomeTab />)
    expect(getByText('home.noInsights')).toBeTruthy()
    expect(queryByTestId('home-query-error')).toBeNull()
    expect(queryByTestId('home-stale-query-data')).toBeNull()
  })

  it('marks retained trusted query data as stale when refresh fails', () => {
    ;(useObligations as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: makeError('connectivity'),
      refetch: refetchObligations,
    })

    const { getByTestId } = render(<HomeTab />)
    expect(getByTestId('home-stale-query-data')).toBeTruthy()
    expect(getByTestId('home-total-amount')).toBeTruthy()
  })

  it('does not retain cached personal data after authorization is denied', () => {
    ;(useObligations as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: makeError('authorization'),
      refetch: refetchObligations,
    })

    const { getByTestId, queryByTestId } = render(<HomeTab />)
    expect(getByTestId('home-query-error')).toBeTruthy()
    expect(queryByTestId('home-stale-query-data')).toBeNull()
    expect(queryByTestId('home-total-amount')).toBeNull()
  })

  it('visibly marks a retained aggregate as stale when recalculation fails', () => {
    ;(useHomeAggregates as jest.Mock).mockReturnValue({
      ...successfulAggregates(false),
      error: makeError('providerUnavailable'),
      isStale: true,
    })

    const { getByTestId } = render(<HomeTab />)
    expect(getByTestId('home-stale-aggregate-data')).toBeTruthy()
    expect(getByTestId('home-total-amount')).toBeTruthy()
  })

  it('retries aggregate failures instead of showing a successful summary', () => {
    const retry = jest.fn()
    ;(useHomeAggregates as jest.Mock).mockReturnValue({
      status: 'error',
      error: makeError('unexpected'),
      retry,
    })

    const { getByTestId, getByText, queryByTestId } = render(<HomeTab />)
    expect(getByTestId('home-aggregate-error')).toBeTruthy()
    expect(queryByTestId('home-total-amount')).toBeNull()
    fireEvent.press(getByText('common.retry'))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('derives demonstration labeling from demo data mode', () => {
    ;(useActiveUserState as jest.Mock).mockReturnValue({ status: 'demo', userId: 'demo-user' })
    const { getByTestId } = render(<HomeTab />)
    expect(getByTestId('home-demo-banner')).toBeTruthy()
  })

  it('never shows demonstration labeling in personal mode', () => {
    ;(useRepositories as jest.Mock).mockReturnValue({
      obligationRepository: {},
      insightRepository: {},
      calculationRunRepository: {},
      reset: jest.fn(),
    })
    const { queryByTestId } = render(<HomeTab />)
    expect(queryByTestId('home-demo-banner')).toBeNull()
  })

  it('distinguishes a revoked session and redirects to sign-in', async () => {
    ;(useActiveUserState as jest.Mock).mockReturnValue({ status: 'signedOut', userId: null })
    const { getByTestId, queryByTestId } = render(<HomeTab />)
    expect(getByTestId('home-session-revoked')).toBeTruthy()
    expect(queryByTestId('home-demo-banner')).toBeNull()
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in'))
  })
})
