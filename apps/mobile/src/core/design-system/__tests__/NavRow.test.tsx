import React from 'react'
import { I18nManager } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { NavRow } from '../primitives/NavRow'
import { NavGroup } from '../primitives/NavGroup'

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual('react-native')
    return <Text testID={`icon-${name}`}>{name}</Text>
  },
}))

describe('NavRow', () => {
  it('renders the label and calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <NavRow icon="time-outline" label="Rate history" onPress={onPress} />,
    )
    fireEvent.press(getByText('Rate history'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders a forward chevron in LTR', () => {
    const original = I18nManager.isRTL
    Object.defineProperty(I18nManager, 'isRTL', { value: false, configurable: true })
    try {
      const { getByTestId } = render(
        <NavRow icon="time-outline" label="Rate history" onPress={jest.fn()} />,
      )
      expect(getByTestId('icon-chevron-forward-outline')).toBeTruthy()
    } finally {
      Object.defineProperty(I18nManager, 'isRTL', { value: original, configurable: true })
    }
  })

  it('renders a back-pointing chevron in RTL', () => {
    const original = I18nManager.isRTL
    Object.defineProperty(I18nManager, 'isRTL', { value: true, configurable: true })
    try {
      const { getByTestId } = render(
        <NavRow icon="time-outline" label="سجل المعدل" onPress={jest.fn()} />,
      )
      expect(getByTestId('icon-chevron-back-outline')).toBeTruthy()
    } finally {
      Object.defineProperty(I18nManager, 'isRTL', { value: original, configurable: true })
    }
  })
})

describe('NavGroup', () => {
  it('groups multiple NavRows in one surface', () => {
    const { getByText } = render(
      <NavGroup testID="tools-group">
        <NavRow icon="time-outline" label="Rate history" onPress={jest.fn()} />
        <NavRow icon="calendar-outline" label="Schedule" onPress={jest.fn()} />
      </NavGroup>,
    )
    expect(getByText('Rate history')).toBeTruthy()
    expect(getByText('Schedule')).toBeTruthy()
  })

  it('renders testID for automation', () => {
    const { getByTestId } = render(
      <NavGroup testID="tools-group">
        <NavRow icon="time-outline" label="Rate history" onPress={jest.fn()} />
      </NavGroup>,
    )
    expect(getByTestId('tools-group')).toBeTruthy()
  })
})
