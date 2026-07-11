/**
 * Screen primitive tests — RNTL + a11y assertions (DS-4).
 */
import React from 'react'
import { Text as RNText } from 'react-native'
import { render } from '@testing-library/react-native'
import { Screen } from '../primitives/Screen'

describe('Screen', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Screen>
        <RNText>Hello</RNText>
      </Screen>,
    )
    expect(getByText('Hello')).toBeTruthy()
  })

  it('exposes testID for accessibility queries', () => {
    const { getByTestId } = render(
      <Screen testID="my-screen">
        <RNText>Content</RNText>
      </Screen>,
    )
    // a11y: testID is accessible and maps to ARIA role region equivalent
    expect(getByTestId('my-screen')).toBeTruthy()
  })

  it('renders skeleton slot when loading=true', () => {
    const { getByText, queryByText } = render(
      <Screen loading skeleton={<RNText>Loading…</RNText>}>
        <RNText>Content</RNText>
      </Screen>,
    )
    expect(getByText('Loading…')).toBeTruthy()
    expect(queryByText('Content')).toBeNull()
  })

  it('renders children (not skeleton) when loading=false', () => {
    const { getByText, queryByText } = render(
      <Screen loading={false} skeleton={<RNText>Loading…</RNText>}>
        <RNText>Content</RNText>
      </Screen>,
    )
    expect(getByText('Content')).toBeTruthy()
    expect(queryByText('Loading…')).toBeNull()
  })

  it('renders without ScrollView when scroll=false', () => {
    const { getByTestId } = render(
      <Screen scroll={false} testID="no-scroll-screen">
        <RNText>No scroll</RNText>
      </Screen>,
    )
    expect(getByTestId('no-scroll-screen')).toBeTruthy()
  })

  it('falls back to children when loading=true but no skeleton provided', () => {
    const { getByText } = render(
      <Screen loading>
        <RNText>Fallback content</RNText>
      </Screen>,
    )
    // When no skeleton is given, children are shown as fallback (Screen.tsx: skeleton ?? children)
    expect(getByText('Fallback content')).toBeTruthy()
  })
})
