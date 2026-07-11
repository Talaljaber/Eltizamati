/**
 * Card primitive tests — RNTL + a11y assertions (DS-4).
 *
 * The Card primitive:
 * - Static: renders as a View (no interactive a11y semantics needed)
 * - Pressable: renders as a Pressable with accessibilityRole="button"
 *   and the required accessibilityLabel
 */
import React from 'react'
import { Text as RNText } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { Card } from '../primitives/Card'

describe('Card', () => {
  // ── Static card ────────────────────────────────────────────────────────────

  it('renders children in static (non-pressable) mode', () => {
    const { getByText } = render(
      <Card>
        <RNText>Card content</RNText>
      </Card>,
    )
    expect(getByText('Card content')).toBeTruthy()
  })

  it('renders testID in static mode', () => {
    const { getByTestId } = render(
      <Card testID="card-static">
        <RNText>Content</RNText>
      </Card>,
    )
    expect(getByTestId('card-static')).toBeTruthy()
  })

  // ── Pressable card ────────────────────────────────────────────────────────

  it('has accessibilityRole="button" when onPress is provided — a11y required', () => {
    const { getByRole } = render(
      <Card onPress={() => {}} accessibilityLabel="Open details">
        <RNText>Pressable card</RNText>
      </Card>,
    )
    // a11y: announced as a button so screen readers know it is interactive
    expect(getByRole('button')).toBeTruthy()
  })

  it('has accessibilityLabel when onPress is provided', () => {
    const { getByLabelText } = render(
      <Card onPress={() => {}} accessibilityLabel="View obligation details">
        <RNText>Loan card</RNText>
      </Card>,
    )
    // a11y: label read by screen reader
    expect(getByLabelText('View obligation details')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <Card onPress={onPress} accessibilityLabel="Tap card">
        <RNText>Tappable</RNText>
      </Card>,
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders testID on pressable card', () => {
    const { getByTestId } = render(
      <Card onPress={() => {}} accessibilityLabel="Card" testID="card-pressable">
        <RNText>Content</RNText>
      </Card>,
    )
    expect(getByTestId('card-pressable')).toBeTruthy()
  })

  it('does NOT render as button when no onPress (static mode)', () => {
    const { queryByRole } = render(
      <Card>
        <RNText>Static</RNText>
      </Card>,
    )
    // Static card is a View — no interactive role
    expect(queryByRole('button')).toBeNull()
  })
})
