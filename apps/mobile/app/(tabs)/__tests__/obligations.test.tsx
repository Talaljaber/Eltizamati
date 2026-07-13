import React from 'react'
import { render, within } from '@testing-library/react-native'
import { DemoSeedProvider } from '@/services/demo-seed-provider'
import { ObligationRow } from '../obligations'

describe('ObligationRow financial rendering', () => {
  it('renders the representative obligation balance through Amount with provenance', () => {
    const obligation = new DemoSeedProvider().provide().card
    const { getByTestId, getByLabelText } = render(
      <ObligationRow obligation={obligation} payments={[]} insights={[]} onPress={jest.fn()} />,
    )
    const amount = getByTestId('obligation-list-balance')
    expect(within(amount).getByText(/JOD|currency\.jod/)).toBeTruthy()
    expect(getByLabelText(/provenance\.demo/)).toBeTruthy()
  })
})
