import React from 'react'
import { RefreshControl } from 'react-native'
import { fireEvent, render, waitFor, within } from '@testing-library/react-native'
import { DemoSeedProvider } from '@/services/demo-seed-provider'
import ObligationsTab, { ObligationRow } from '../obligations'
import { DEMO_DATE, aCard, aMurabaha } from '@eltizamati/demo-data'
import { makeError, toLocalDate } from '@eltizamati/domain'
import { useObligations } from '@/features/home/api/use-obligations'
import { usePaymentsByObligation } from '@/features/home/api/use-payments-by-obligation'
import { useInsightsByObligation } from '@/features/home/api/use-insights-by-obligation'
import { useActiveUserState } from '@/features/auth/hooks/use-active-user'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'

jest.mock('@/features/home/api/use-obligations', () => ({ useObligations: jest.fn() }))
jest.mock('@/features/home/api/use-payments-by-obligation', () => ({
  usePaymentsByObligation: jest.fn(),
}))
jest.mock('@/features/home/api/use-insights-by-obligation', () => ({
  useInsightsByObligation: jest.fn(),
}))
jest.mock('@/features/auth/hooks/use-active-user', () => ({ useActiveUserState: jest.fn() }))
jest.mock('@/features/repositories/hooks/use-repositories', () => ({
  useRepositories: jest.fn(),
}))

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}))

const personalCard = {
  ...aCard(),
  provenance: {
    source: 'userEntered' as const,
    observedAt: '2026-07-01T00:00:00.000Z',
    recordedAt: '2026-07-01T00:00:00.000Z',
  },
}

describe('ObligationRow financial rendering', () => {
  it('renders the representative obligation balance through Amount with provenance', () => {
    const obligation = new DemoSeedProvider().provide().card
    const { getByTestId, getByLabelText } = render(
      <ObligationRow
        obligation={obligation}
        payments={[]}
        insights={[]}
        asOf={DEMO_DATE}
        onPress={jest.fn()}
      />,
    )
    const amount = getByTestId('obligation-list-balance')
    expect(within(amount).getByText(/JOD|currency\.jod/)).toBeTruthy()
    expect(getByLabelText(/provenance\.demo/)).toBeTruthy()
  })

  it('uses the supplied personal date across a due-status boundary', () => {
    const props = {
      obligation: personalCard,
      payments: [],
      insights: [],
      onPress: jest.fn(),
    }
    const before = render(<ObligationRow {...props} asOf={toLocalDate('2026-07-16')} />)
    expect(before.getByText('status.onTrack')).toBeTruthy()
    before.unmount()

    const after = render(<ObligationRow {...props} asOf={toLocalDate('2026-07-17')} />)
    expect(after.getByText('status.overdue')).toBeTruthy()
  })

  it('renders a placeholder instead of omitting the balance slot when none is on file', () => {
    const obligation = aMurabaha()
    const { getByTestId, queryByTestId } = render(
      <ObligationRow
        obligation={obligation}
        payments={[]}
        insights={[]}
        asOf={DEMO_DATE}
        onPress={jest.fn()}
      />,
    )
    expect(queryByTestId('obligation-list-balance')).toBeNull()
    expect(getByTestId('obligation-list-balance-unavailable')).toBeTruthy()
  })
})

describe('ObligationsTab personal-data states', () => {
  const refetchObligations = jest.fn().mockResolvedValue(undefined)
  const refetchPayments = jest.fn().mockResolvedValue(undefined)
  const refetchInsights = jest.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRepositories as jest.Mock).mockReturnValue({
      obligationRepository: {},
      paymentRepository: {},
      insightRepository: {},
    })
    ;(useActiveUserState as jest.Mock).mockReturnValue({
      status: 'authenticated',
      userId: 'user-1',
    })
    ;(useObligations as jest.Mock).mockReturnValue({
      data: [personalCard],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchObligations,
    })
    ;(usePaymentsByObligation as jest.Mock).mockReturnValue({
      data: new Map([[personalCard.id, []]]),
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: refetchPayments,
    })
    ;(useInsightsByObligation as jest.Mock).mockReturnValue({
      data: new Map(),
      isLoading: false,
      isFetching: false,
      error: undefined,
      hasData: true,
      refetch: refetchInsights,
    })
  })

  it('does not convert a failed obligations query into successful empty data', () => {
    ;(useObligations as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: makeError('connectivity'),
      refetch: refetchObligations,
    })

    const { getByTestId, getByText, queryByTestId } = render(<ObligationsTab />)
    expect(getByTestId('obligations-query-error')).toBeTruthy()
    expect(getByText('error.offlineTitle')).toBeTruthy()
    expect(queryByTestId('obligations-empty')).toBeNull()
  })

  it('does not show pull-to-refresh UI for shared background fetching', () => {
    ;(useObligations as jest.Mock).mockReturnValue({
      data: [personalCard],
      isLoading: false,
      isFetching: true,
      error: null,
      refetch: refetchObligations,
    })

    expect(render(<ObligationsTab />).UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false)
  })

  it('does not render a row with fabricated empty payments after a failed query', () => {
    ;(usePaymentsByObligation as jest.Mock).mockReturnValue({
      data: new Map(),
      isLoading: false,
      isFetching: false,
      error: makeError('providerUnavailable'),
      refetch: refetchPayments,
    })

    const { getByTestId, getByText, queryByText } = render(<ObligationsTab />)
    expect(getByTestId('obligations-query-error')).toBeTruthy()
    expect(getByText('error.providerUnavailable')).toBeTruthy()
    expect(queryByText(personalCard.institution.name)).toBeNull()
  })

  it('renders successful empty data as an empty state', () => {
    ;(useObligations as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchObligations,
    })
    ;(usePaymentsByObligation as jest.Mock).mockReturnValue({
      data: new Map(),
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: refetchPayments,
    })

    const { getByTestId, queryByTestId } = render(<ObligationsTab />)
    expect(getByTestId('obligations-empty')).toBeTruthy()
    expect(queryByTestId('obligations-query-error')).toBeNull()
  })

  it('visibly marks trusted retained data as stale', () => {
    ;(usePaymentsByObligation as jest.Mock).mockReturnValue({
      data: new Map([[personalCard.id, []]]),
      isLoading: false,
      isFetching: false,
      error: makeError('connectivity'),
      refetch: refetchPayments,
    })

    const { getByTestId, getByText } = render(<ObligationsTab />)
    expect(getByTestId('obligations-stale-data')).toBeTruthy()
    expect(getByText(personalCard.institution.name)).toBeTruthy()
  })

  it('retries all obligations data sources from the error surface', async () => {
    ;(useObligations as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: makeError('unexpected'),
      refetch: refetchObligations,
    })

    const { getByText } = render(<ObligationsTab />)
    fireEvent.press(getByText('common.retry'))

    await waitFor(() => expect(refetchObligations).toHaveBeenCalledTimes(1))
    expect(refetchPayments).toHaveBeenCalledTimes(1)
    expect(refetchInsights).toHaveBeenCalledTimes(1)
  })

  it('derives demonstration labeling from demo data mode', () => {
    ;(useActiveUserState as jest.Mock).mockReturnValue({ status: 'demo', userId: 'demo-user' })
    const { getByTestId } = render(<ObligationsTab />)
    expect(getByTestId('obligations-demo-banner')).toBeTruthy()
  })

  it('never shows demonstration labeling in personal mode', () => {
    ;(useRepositories as jest.Mock).mockReturnValue({
      obligationRepository: {},
      paymentRepository: {},
      insightRepository: {},
      reset: jest.fn(),
    })
    const { queryByTestId } = render(<ObligationsTab />)
    expect(queryByTestId('obligations-demo-banner')).toBeNull()
  })

  it('distinguishes a revoked session and redirects to sign-in', async () => {
    ;(useActiveUserState as jest.Mock).mockReturnValue({ status: 'signedOut', userId: null })
    const { getByTestId, queryByTestId } = render(<ObligationsTab />)
    expect(getByTestId('obligations-session-revoked')).toBeTruthy()
    expect(queryByTestId('obligations-demo-banner')).toBeNull()
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in'))
  })
})
