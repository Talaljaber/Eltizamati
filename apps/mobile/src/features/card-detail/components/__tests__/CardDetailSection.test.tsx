/**
 * F-08 (STOP-SHIP audit, docs/ship-situation.md): CardDetailSection previously
 * rendered every material money field as `Sourced<Money>.value.toStorageString()`
 * — a raw decimal string with no currency label, no locale formatting, and no
 * provenance distinction, and presented client-derived "available credit" with
 * no marker that it is not itself an officially-supplied value. These tests
 * prove the corrected behavior: every material field routes through the Amount
 * primitive (currency-formatted, provenance-labeled), and the derived field is
 * never rendered with official precision regardless of its inputs' provenance.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import { Money, Rate } from '@eltizamati/domain'
import type { CreditCard, Provenance } from '@eltizamati/domain'
import { aCard } from '@eltizamati/demo-data'
import { CardDetailSection } from '../CardDetailSection'

const officialProvenance: Provenance = {
  source: 'official',
  providerId: 'openbanking:roya',
  observedAt: '2026-07-01T00:00:00Z',
  recordedAt: '2026-07-01T00:00:00Z',
}

const userEnteredProvenance: Provenance = {
  source: 'userEntered',
  providerId: 'manual',
  observedAt: '2026-07-01T00:00:00Z',
  recordedAt: '2026-07-01T00:00:00Z',
}

function cardWith(details: Partial<CreditCard['cardDetails']>): CreditCard {
  const base = aCard()
  return { ...base, cardDetails: { ...base.cardDetails, ...details } }
}

describe('CardDetailSection — F-08 provenance-aware money rendering', () => {
  it('renders credit limit and current balance as locale-formatted currency, not a raw storage string', () => {
    const obligation = cardWith({
      creditLimit: { value: Money.of('12345', 'JOD'), provenance: officialProvenance },
      currentBalance: { value: Money.of('2350', 'JOD'), provenance: officialProvenance },
      statementBalance: undefined,
    })
    const { getByText, queryByText } = render(<CardDetailSection obligation={obligation} />)

    expect(getByText(/12,345/)).toBeTruthy()
    expect(getByText(/2,350/)).toBeTruthy()
    // The pre-fix behavior rendered the bare storage string with no grouping.
    expect(queryByText('12345')).toBeNull()
    expect(queryByText('2350')).toBeNull()
  })

  it('never presents derived available credit as an official value, even when both inputs are official', () => {
    const obligation = cardWith({
      creditLimit: { value: Money.of('4000', 'JOD'), provenance: officialProvenance },
      currentBalance: { value: Money.of('2350', 'JOD'), provenance: officialProvenance },
    })
    const { getByText } = render(<CardDetailSection obligation={obligation} />)

    // formatMoneyEstimate prefixes "≈" (BR-CALC-014) — the one visible signal
    // that this figure is derived, not server-confirmed, regardless of the
    // official provenance on its inputs.
    expect(getByText(/≈.*1,650/)).toBeTruthy()
  })

  it('renders a negative available credit honestly instead of clamping to zero', () => {
    const obligation = cardWith({
      creditLimit: { value: Money.of('1000', 'JOD'), provenance: officialProvenance },
      currentBalance: { value: Money.of('1250', 'JOD'), provenance: officialProvenance },
    })
    const { getByText } = render(<CardDetailSection obligation={obligation} />)

    expect(getByText(/≈.*-250/)).toBeTruthy()
  })

  it('renders a missing statement balance as unknown, not zero', () => {
    const obligation = cardWith({ statementBalance: undefined })
    const { getAllByText } = render(<CardDetailSection obligation={obligation} />)

    expect(getAllByText('common.unknown').length).toBeGreaterThan(0)
  })

  it('renders purchase/cash-advance APR as a percentage with a provenance badge, not a raw decimal fraction', () => {
    const obligation = cardWith({
      purchaseApr: { value: Rate.fromPercent('24'), provenance: userEnteredProvenance },
    })
    const { getByText, queryByText } = render(<CardDetailSection obligation={obligation} />)

    expect(getByText('24.00%')).toBeTruthy()
    // Pre-fix behavior rendered the internal decimal form directly.
    expect(queryByText('0.24')).toBeNull()
  })

  it('renders a missing APR as unknown', () => {
    const obligation = cardWith({ purchaseApr: undefined, cashAdvanceApr: undefined })
    const { getAllByText } = render(<CardDetailSection obligation={obligation} />)

    expect(getAllByText('common.unknown').length).toBeGreaterThanOrEqual(2)
  })

  it('renders fee amounts through the same provenance-aware formatting', () => {
    const obligation = cardWith({
      fees: [
        {
          type: 'annual',
          amount: { value: Money.of('777', 'JOD'), provenance: officialProvenance },
        },
      ],
    })
    const { getByText, queryByText } = render(<CardDetailSection obligation={obligation} />)

    expect(getByText(/777/)).toBeTruthy()
    expect(queryByText('777')).toBeNull() // formatted (with currency suffix), not the bare storage string
  })
})
