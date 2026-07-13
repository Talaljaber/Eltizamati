import React from 'react'
import { render, within } from '@testing-library/react-native'
import { Money, type Provenance } from '@eltizamati/domain'
import HomeTab, { SummaryCard } from '../index'
import { useObligations } from '@/features/home/api/use-obligations'
import { useInsights } from '@/features/home/api/use-insights'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
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
jest.mock('@/features/auth/hooks/use-active-user', () => ({ useActiveUser: jest.fn() }))
jest.mock('@/features/repositories/hooks/use-repositories', () => ({
  useRepositories: jest.fn(),
}))
jest.mock('@/features/home/hooks/use-home-aggregates', () => ({
  useHomeAggregates: jest.fn(),
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
  }
}

describe('Home financial rendering', () => {
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
        }}
      />,
    )
    expect(getAllByText('home.totalPending').length).toBeGreaterThanOrEqual(1)
  })

  it('keeps the Home loading state safe', () => {
    ;(useRepositories as jest.Mock).mockReturnValue({
      obligationRepository: {},
      insightRepository: {},
    })
    ;(useActiveUser as jest.Mock).mockReturnValue('user-1')
    ;(useObligations as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    })
    ;(useInsights as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    })
    ;(useHomeAggregates as jest.Mock).mockReturnValue({ status: 'loading' })
    expect(() => render(<HomeTab />)).not.toThrow()
  })
})
