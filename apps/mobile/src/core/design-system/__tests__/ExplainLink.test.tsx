import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ExplainLink } from '../primitives/ExplainLink'

describe('ExplainLink', () => {
  it('renders the default label from i18n', () => {
    const { getByText } = render(<ExplainLink onPress={jest.fn()} />)
    expect(getByText('common.explain')).toBeTruthy()
  })

  it('renders a custom label when provided', () => {
    const { getByText } = render(<ExplainLink onPress={jest.fn()} label="Why?" />)
    expect(getByText('Why?')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByRole } = render(<ExplainLink onPress={onPress} />)
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('has accessibilityRole="button" and a matching label', () => {
    const { getByRole } = render(<ExplainLink onPress={jest.fn()} />)
    const el = getByRole('button')
    expect(el.props.accessibilityLabel).toBe('common.explain')
  })

  it('renders testID for automation', () => {
    const { getByTestId } = render(<ExplainLink onPress={jest.fn()} testID="explain-schedule" />)
    expect(getByTestId('explain-schedule')).toBeTruthy()
  })
})
