/**
 * Button primitive tests — RNTL + a11y assertions (DS-4).
 *
 * The Button primitive enforces:
 * - accessibilityRole="button" always
 * - accessibilityLabel = label prop always
 * - accessibilityState.disabled when disabled or loading
 * - accessibilityState.busy when loading
 * - Min 44pt touch target (style-level, not testable in RNTL)
 */
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '../primitives/Button'

describe('Button', () => {
  it('renders label text', () => {
    const { getByText } = render(<Button label="Submit" onPress={() => {}} />)
    expect(getByText('Submit')).toBeTruthy()
  })

  // ── Accessibility (DS-4 requirement) ──────────────────────────────────────

  it('has accessibilityRole="button" — required for screen readers', () => {
    const { getByRole } = render(<Button label="Click me" onPress={() => {}} />)
    // a11y: button role is announced by screen readers
    expect(getByRole('button')).toBeTruthy()
  })

  it('has accessibilityLabel matching the label prop', () => {
    const { getByLabelText } = render(<Button label="Confirm" onPress={() => {}} />)
    // a11y: screen reader reads the label
    expect(getByLabelText('Confirm')).toBeTruthy()
  })

  it('sets accessibilityState.busy when loading=true', () => {
    const { getByRole } = render(
      <Button label="Loading…" onPress={() => {}} loading />,
    )
    // a11y: screen reader announces "busy" state during loading
    const btn = getByRole('button')
    expect(btn.props.accessibilityState).toMatchObject({ busy: true })
  })

  it('sets accessibilityState.disabled when disabled=true', () => {
    const { getByRole } = render(
      <Button label="Disabled" onPress={() => {}} disabled />,
    )
    // a11y: screen reader announces disabled state
    const btn = getByRole('button')
    expect(btn.props.accessibilityState).toMatchObject({ disabled: true })
  })

  it('sets accessibilityState.disabled when loading=true (loading implies disabled)', () => {
    const { getByRole } = render(
      <Button label="Loading" onPress={() => {}} loading />,
    )
    const btn = getByRole('button')
    expect(btn.props.accessibilityState).toMatchObject({ disabled: true, busy: true })
  })

  // ── Interaction ────────────────────────────────────────────────────────────

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByRole } = render(<Button label="Press me" onPress={onPress} />)
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onPress when disabled', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <Button label="Disabled" onPress={onPress} disabled />,
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('does NOT call onPress when loading', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <Button label="Loading" onPress={onPress} loading />,
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  // ── Variants ───────────────────────────────────────────────────────────────

  it('renders secondary variant without error', () => {
    const { getByRole } = render(
      <Button label="Secondary" onPress={() => {}} variant="secondary" />,
    )
    expect(getByRole('button')).toBeTruthy()
  })

  it('renders ghost variant without error', () => {
    const { getByRole } = render(
      <Button label="Ghost" onPress={() => {}} variant="ghost" />,
    )
    expect(getByRole('button')).toBeTruthy()
  })

  it('renders destructive variant without error', () => {
    const { getByRole } = render(
      <Button label="Delete" onPress={() => {}} variant="destructive" />,
    )
    expect(getByRole('button')).toBeTruthy()
  })

  it('renders testID when provided', () => {
    const { getByTestId } = render(
      <Button label="Labelled" onPress={() => {}} testID="btn-submit" />,
    )
    expect(getByTestId('btn-submit')).toBeTruthy()
  })
})
