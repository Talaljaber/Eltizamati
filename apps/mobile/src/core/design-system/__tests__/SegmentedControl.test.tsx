import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SegmentedControl } from '../primitives/SegmentedControl'

const options = [
  { value: 'housing', label: 'Housing' },
  { value: 'personal', label: 'Personal' },
]

describe('SegmentedControl', () => {
  it('renders every option label', () => {
    const { getByText } = render(
      <SegmentedControl options={options} value="housing" onChange={jest.fn()} />,
    )
    expect(getByText('Housing')).toBeTruthy()
    expect(getByText('Personal')).toBeTruthy()
  })

  it('calls onChange with the tapped option value', () => {
    const onChange = jest.fn()
    const { getByText } = render(
      <SegmentedControl options={options} value="housing" onChange={onChange} />,
    )
    fireEvent.press(getByText('Personal'))
    expect(onChange).toHaveBeenCalledWith('personal')
  })

  it('sets accessibilityState.selected on the active segment only', () => {
    const { getAllByRole } = render(
      <SegmentedControl options={options} value="housing" onChange={jest.fn()} />,
    )
    const [housing, personal] = getAllByRole('tab')
    expect(housing.props.accessibilityState).toEqual({ selected: true })
    expect(personal.props.accessibilityState).toEqual({ selected: false })
  })

  it('renders testID for automation', () => {
    const { getByTestId } = render(
      <SegmentedControl
        options={options}
        value="housing"
        onChange={jest.fn()}
        testID="purpose-toggle"
      />,
    )
    expect(getByTestId('purpose-toggle')).toBeTruthy()
  })
})
