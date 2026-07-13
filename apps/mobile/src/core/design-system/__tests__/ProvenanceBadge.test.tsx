/**
 * ProvenanceBadge tests — provenance is identifiable without relying on color:
 * every source class exposes an accessible label (icon is decorative/hidden).
 * i18n mock returns the key, so labels assert as `provenance.*` keys.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import type { SourceClass } from '@eltizamati/domain'
import { ProvenanceBadge } from '../primitives/ProvenanceBadge'

const CASES: { source: SourceClass; key: string }[] = [
  { source: 'official', key: 'provenance.official' },
  { source: 'bureau', key: 'provenance.bureau' },
  { source: 'userEntered', key: 'provenance.userEntered' },
  { source: 'estimate', key: 'provenance.estimate' },
  { source: 'demo', key: 'provenance.demo' },
]

describe('ProvenanceBadge', () => {
  it.each(CASES)('renders an accessible label for $source (not color-alone)', ({ source, key }) => {
    const { getByLabelText, getByText } = render(<ProvenanceBadge source={source} />)
    expect(getByLabelText(key)).toBeTruthy()
    expect(getByText(key)).toBeTruthy()
  })

  it('applies testID for automation', () => {
    const { getByTestId } = render(<ProvenanceBadge source="official" testID="prov" />)
    expect(getByTestId('prov')).toBeTruthy()
  })
})
