/**
 * Text primitive tests — RNTL + a11y assertions (DS-4).
 *
 * The Text primitive enforces:
 * - Variant-driven typography (no raw style props)
 * - Logical alignment only ('start'/'end'/'center') — never 'left'/'right'
 * - Color via semantic color map
 */
import React from 'react'
import { I18nManager } from 'react-native'
import { render } from '@testing-library/react-native'
import { Text } from '../primitives/Text'

describe('Text', () => {
  it('renders text content', () => {
    const { getByText } = render(<Text>Hello world</Text>)
    expect(getByText('Hello world')).toBeTruthy()
  })

  it('is accessible — text node can be queried by value', () => {
    const { getByText } = render(
      <Text variant="body" testID="text-el">
        Accessible text
      </Text>,
    )
    // a11y: text is readable by screen readers via its content
    const el = getByText('Accessible text')
    expect(el).toBeTruthy()
  })

  it('applies testID for automation', () => {
    const { getByTestId } = render(<Text testID="my-text">Content</Text>)
    expect(getByTestId('my-text')).toBeTruthy()
  })

  it('renders with title variant without error', () => {
    const { getByText } = render(<Text variant="title">Title text</Text>)
    expect(getByText('Title text')).toBeTruthy()
  })

  it('renders with amountMd variant (tabular numerals intent)', () => {
    const { getByText } = render(<Text variant="amountMd">123.456</Text>)
    expect(getByText('123.456')).toBeTruthy()
  })

  it('renders with caption variant', () => {
    const { getByText } = render(<Text variant="caption">Small text</Text>)
    expect(getByText('Small text')).toBeTruthy()
  })

  it('resolves align=center without crashing', () => {
    const { getByText } = render(<Text align="center">Centered</Text>)
    expect(getByText('Centered')).toBeTruthy()
  })

  it('resolves logical align=start in LTR without crashing', () => {
    // In LTR (I18nManager.isRTL = false), 'start' maps to 'left'
    const originalRTL = I18nManager.isRTL
    Object.defineProperty(I18nManager, 'isRTL', { value: false, configurable: true })

    const { getByText } = render(<Text align="start">Start-aligned</Text>)
    expect(getByText('Start-aligned')).toBeTruthy()

    Object.defineProperty(I18nManager, 'isRTL', { value: originalRTL, configurable: true })
  })

  it('resolves logical align=end in RTL without crashing', () => {
    // In RTL (I18nManager.isRTL = true), 'end' maps to 'left'
    const originalRTL = I18nManager.isRTL
    Object.defineProperty(I18nManager, 'isRTL', { value: true, configurable: true })

    const { getByText } = render(<Text align="end">End-aligned</Text>)
    expect(getByText('End-aligned')).toBeTruthy()

    Object.defineProperty(I18nManager, 'isRTL', { value: originalRTL, configurable: true })
  })

  it('renders secondary color variant without error', () => {
    const { getByText } = render(<Text color="secondary">Secondary</Text>)
    expect(getByText('Secondary')).toBeTruthy()
  })

  it('renders critical color variant without error', () => {
    const { getByText } = render(<Text color="critical">Error message</Text>)
    expect(getByText('Error message')).toBeTruthy()
  })
})
