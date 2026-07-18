import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { buildDemoCard, buildDemoLoan, buildDemoMurabaha, DEMO_DATE } from '@eltizamati/demo-data'
import ObligationsTab from '../obligations'

jest.mock('@/features/repositories/hooks/use-repositories', () => ({
  useRepositories: () => ({
    obligationRepository: {},
    paymentRepository: {},
    insightRepository: {},
  }),
}))
jest.mock('@/features/auth/hooks/use-active-user', () => ({
  useActiveUserState: () => ({ status: 'demo', userId: 'demo-user' }),
}))

// Demo builders reuse the same fictional institution name across kinds
// (both the conventional loan and card fixtures default to "Bank of Amman");
// override to distinct names so text queries below are unambiguous.
const mockLoan = { ...buildDemoLoan(DEMO_DATE), institution: { name: 'Fixture Loan Bank' } }
const mockCard = { ...buildDemoCard(DEMO_DATE), institution: { name: 'Fixture Card Bank' } }
const mockMurabaha = {
  ...buildDemoMurabaha(DEMO_DATE),
  institution: { name: 'Fixture Islamic Bank' },
}

jest.mock('@/features/home/api/use-obligations', () => ({
  useObligations: () => ({
    data: [mockLoan, mockCard, mockMurabaha],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}))
jest.mock('@/features/home/api/use-payments-by-obligation', () => ({
  usePaymentsByObligation: () => ({
    data: new Map([
      [mockLoan.id, []],
      [mockCard.id, []],
      [mockMurabaha.id, []],
    ]),
    isLoading: false,
    error: undefined,
    refetch: jest.fn(),
  }),
}))
jest.mock('@/features/home/api/use-insights-by-obligation', () => ({
  useInsightsByObligation: () => ({
    data: new Map(),
    isLoading: false,
    error: undefined,
    hasData: true,
    refetch: jest.fn(),
  }),
}))

describe('ObligationsTab — filter chips', () => {
  it('renders all obligations under the "all" filter', () => {
    const { getByText } = render(<ObligationsTab />)
    expect(getByText(mockLoan.institution.name)).toBeTruthy()
    expect(getByText(mockCard.institution.name)).toBeTruthy()
    expect(getByText(mockMurabaha.institution.name)).toBeTruthy()
  })

  it('filters to conventional loans only when "Loans" is tapped', () => {
    const { getByTestId, getByText, queryByText } = render(<ObligationsTab />)
    fireEvent.press(getByTestId('obligations-filter-loan'))
    expect(getByText(mockLoan.institution.name)).toBeTruthy()
    expect(queryByText(mockCard.institution.name)).toBeNull()
    expect(queryByText(mockMurabaha.institution.name)).toBeNull()
  })

  it('filters to Islamic products when "Islamic" is tapped', () => {
    const { getByTestId, getByText, queryByText } = render(<ObligationsTab />)
    fireEvent.press(getByTestId('obligations-filter-islamic'))
    expect(getByText(mockMurabaha.institution.name)).toBeTruthy()
    expect(queryByText(mockLoan.institution.name)).toBeNull()
  })

  it('marks the active filter as selected', () => {
    const { getByTestId } = render(<ObligationsTab />)
    fireEvent.press(getByTestId('obligations-filter-card'))
    expect(getByTestId('obligations-filter-card').props.accessibilityState).toEqual({
      selected: true,
    })
    expect(getByTestId('obligations-filter-all').props.accessibilityState).toEqual({
      selected: false,
    })
  })
})
