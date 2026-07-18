import React from 'react'
import { render } from '@testing-library/react-native'
import { InlineState } from '../primitives/InlineState'

describe('InlineState', () => {
  it.each([
    ['loading', 'Loading schedule…'],
    ['error', 'Could not load the schedule.'],
    ['empty', 'No periods to show.'],
    ['unsupported', 'Not available for this product.'],
    ['refused', 'Calculation refused — missing inputs.'],
  ] as const)('renders the %s message', (kind, message) => {
    const { getByText } = render(<InlineState kind={kind} message={message} />)
    expect(getByText(message)).toBeTruthy()
  })

  it('exposes the message as an accessible live region', () => {
    const { getByLabelText } = render(<InlineState kind="error" message="Could not load." />)
    expect(getByLabelText('Could not load.')).toBeTruthy()
  })

  it('renders testID for automation', () => {
    const { getByTestId } = render(
      <InlineState kind="loading" message="Loading…" testID="schedule-state" />,
    )
    expect(getByTestId('schedule-state')).toBeTruthy()
  })
})
