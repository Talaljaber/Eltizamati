import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Money } from '@eltizamati/domain'
import type { Provenance } from '@eltizamati/domain'
import { HeroAmount } from '../primitives/HeroAmount'
import { Text } from '../primitives/Text'

const officialProvenance: Provenance = {
  source: 'official',
  providerId: 'openbanking:roya',
  observedAt: '2026-07-01T00:00:00Z',
  recordedAt: '2026-07-01T00:00:00Z',
}

describe('HeroAmount', () => {
  it('renders the label and the formatted figure', () => {
    const { getByText } = render(
      <HeroAmount
        label="Current balance"
        money={Money.of('12450.5', 'JOD')}
        provenance={officialProvenance}
      />,
    )
    expect(getByText('Current balance')).toBeTruthy()
    expect(getByText(/12,450\.5/)).toBeTruthy()
  })

  it('renders the provenance badge', () => {
    const { getByText } = render(
      <HeroAmount label="Balance" money={Money.of('100', 'JOD')} provenance={officialProvenance} />,
    )
    // The badge's visible caption; Amount's own accessibilityLabel also
    // contains this text but is not a visible text node, so getByText
    // resolves to the badge alone.
    expect(getByText('provenance.official')).toBeTruthy()
  })

  it('renders an ExplainLink and fires onExplain when tapped', () => {
    const onExplain = jest.fn()
    const { getByText } = render(
      <HeroAmount
        label="Balance"
        money={Money.of('100', 'JOD')}
        provenance={officialProvenance}
        onExplain={onExplain}
      />,
    )
    fireEvent.press(getByText('common.explain'))
    expect(onExplain).toHaveBeenCalledTimes(1)
  })

  it('does not render an explain affordance when onExplain is omitted', () => {
    const { queryByText } = render(
      <HeroAmount label="Balance" money={Money.of('100', 'JOD')} provenance={officialProvenance} />,
    )
    expect(queryByText('common.explain')).toBeNull()
  })

  it('renders supporting metrics when provided', () => {
    const { getByText } = render(
      <HeroAmount
        label="Balance"
        money={Money.of('100', 'JOD')}
        provenance={officialProvenance}
        supporting={[{ label: 'Next payment', value: <Text variant="amountSm">50 JOD</Text> }]}
      />,
    )
    expect(getByText('Next payment')).toBeTruthy()
    expect(getByText('50 JOD')).toBeTruthy()
  })

  it('renders testID for automation', () => {
    const { getByTestId } = render(
      <HeroAmount
        label="Balance"
        money={Money.of('100', 'JOD')}
        provenance={officialProvenance}
        testID="hero-balance"
      />,
    )
    expect(getByTestId('hero-balance')).toBeTruthy()
  })
})
