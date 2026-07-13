/**
 * Text typography tests — tabular numerals on amounts + blocked-font fallback.
 */
import React from 'react'
import { StyleSheet } from 'react-native'
import { render } from '@testing-library/react-native'
import { Text } from '../primitives/Text'

function flattenedStyle(el: { props: { style: unknown } }) {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>
}

describe('Text — typography', () => {
  it('applies tabular numerals to amount variants (column alignment)', () => {
    const { getByTestId } = render(
      <Text variant="amountLg" testID="amt">
        12,450.500
      </Text>,
    )
    const style = flattenedStyle(getByTestId('amt'))
    expect(style.fontVariant).toEqual(['tabular-nums'])
  })

  it('does NOT apply tabular numerals to body text', () => {
    const { getByTestId } = render(
      <Text variant="body" testID="body">
        Hello
      </Text>,
    )
    const style = flattenedStyle(getByTestId('body'))
    expect(style.fontVariant).toBeUndefined()
  })

  it('renders the amountHero variant (dominant figure)', () => {
    const { getByText } = render(<Text variant="amountHero">2,000</Text>)
    expect(getByText('2,000')).toBeTruthy()
  })

  it('falls back to the system font while brand fonts are blocked (fontFamily undefined)', () => {
    const { getByTestId } = render(
      <Text variant="heading" testID="h">
        Heading
      </Text>,
    )
    const style = flattenedStyle(getByTestId('h'))
    expect(style.fontFamily).toBeUndefined()
  })
})
