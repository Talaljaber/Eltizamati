/**
 * InsightBanner tests — renders title/body across severities using semantic
 * tokens (no emoji, no string-concatenated tints). Severity is conveyed by
 * icon + text, never color alone.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import { InsightBanner } from '../primitives/InsightBanner'

describe('InsightBanner', () => {
  it.each(['urgent', 'attention', 'calm'] as const)(
    'renders title and body for %s severity',
    (severity) => {
      const { getByText } = render(
        <InsightBanner title="Rate changed" body="Your installment rose" severity={severity} />,
      )
      expect(getByText('Rate changed')).toBeTruthy()
      expect(getByText('Your installment rose')).toBeTruthy()
    },
  )

  it('renders an unread marker without crashing', () => {
    const { getByTestId } = render(
      <InsightBanner title="T" body="B" severity="attention" unread testID="ins" />,
    )
    expect(getByTestId('ins')).toBeTruthy()
  })
})
