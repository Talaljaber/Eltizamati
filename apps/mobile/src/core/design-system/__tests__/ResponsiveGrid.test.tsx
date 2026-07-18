/**
 * ResponsiveGrid tests — flows children into columns on wide web, stays a
 * single full-width column on native/narrow web (DS-4).
 */
import React from 'react'
import { Text as RNText } from 'react-native'
import { render } from '@testing-library/react-native'
import { ResponsiveGrid } from '../primitives/ResponsiveGrid'
import * as responsiveLayout from '../use-responsive-layout'

function mockLayout(isWideWeb: boolean, width: number) {
  jest.spyOn(responsiveLayout, 'useResponsiveLayout').mockReturnValue({
    width,
    isWeb: isWideWeb,
    isWide: isWideWeb,
    isWideWeb,
  })
}

describe('ResponsiveGrid', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders all children on native/narrow web (single column)', () => {
    mockLayout(false, 375)
    const { getByText } = render(
      <ResponsiveGrid>
        <RNText>Item 1</RNText>
        <RNText>Item 2</RNText>
      </ResponsiveGrid>,
    )
    expect(getByText('Item 1')).toBeTruthy()
    expect(getByText('Item 2')).toBeTruthy()
  })

  it('renders all children on wide web (multi-column)', () => {
    mockLayout(true, 1400)
    const { getByText } = render(
      <ResponsiveGrid minColumnWidth={320}>
        <RNText>Item 1</RNText>
        <RNText>Item 2</RNText>
        <RNText>Item 3</RNText>
      </ResponsiveGrid>,
    )
    expect(getByText('Item 1')).toBeTruthy()
    expect(getByText('Item 2')).toBeTruthy()
    expect(getByText('Item 3')).toBeTruthy()
  })

  it('renders a single wide-web child without crashing (non-array children)', () => {
    mockLayout(true, 1400)
    const { getByText } = render(
      <ResponsiveGrid>
        <RNText>Solo item</RNText>
      </ResponsiveGrid>,
    )
    expect(getByText('Solo item')).toBeTruthy()
  })

  it('forwards testID', () => {
    mockLayout(false, 375)
    const { getByTestId } = render(
      <ResponsiveGrid testID="grid">
        <RNText>Item</RNText>
      </ResponsiveGrid>,
    )
    expect(getByTestId('grid')).toBeTruthy()
  })
})
