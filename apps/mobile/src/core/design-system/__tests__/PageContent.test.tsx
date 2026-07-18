/**
 * PageContent tests — the wide-web-only centering wrapper. Native and
 * narrow web must be a transparent passthrough (DS-4).
 */
import React from 'react'
import { Text as RNText } from 'react-native'
import { render } from '@testing-library/react-native'
import { PageContent } from '../primitives/PageContent'
import * as responsiveLayout from '../use-responsive-layout'

function mockLayout(isWideWeb: boolean) {
  jest.spyOn(responsiveLayout, 'useResponsiveLayout').mockReturnValue({
    width: isWideWeb ? 1400 : 375,
    isWeb: isWideWeb,
    isWide: isWideWeb,
    isWideWeb,
  })
}

describe('PageContent', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders children unchanged on native/narrow web (passthrough)', () => {
    mockLayout(false)
    const { getByText } = render(
      <PageContent>
        <RNText>Body</RNText>
      </PageContent>,
    )
    expect(getByText('Body')).toBeTruthy()
  })

  it('renders children inside a centered max-width column on wide web', () => {
    mockLayout(true)
    const { getByText, getByTestId } = render(
      <PageContent testID="page-content">
        <RNText>Body</RNText>
      </PageContent>,
    )
    expect(getByText('Body')).toBeTruthy()
    expect(getByTestId('page-content')).toBeTruthy()
  })

  it('accepts a readable maxWidth variant on wide web', () => {
    mockLayout(true)
    const { getByText } = render(
      <PageContent maxWidth="readable">
        <RNText>Form field</RNText>
      </PageContent>,
    )
    expect(getByText('Form field')).toBeTruthy()
  })

  it('forwards testID on native/narrow web', () => {
    mockLayout(false)
    const { getByTestId } = render(
      <PageContent testID="page-content-native">
        <RNText>Body</RNText>
      </PageContent>,
    )
    expect(getByTestId('page-content-native')).toBeTruthy()
  })
})
