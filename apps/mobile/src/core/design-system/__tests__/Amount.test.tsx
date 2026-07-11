/**
 * Amount primitive tests — RNTL + a11y assertions (DS-4).
 *
 * The Amount primitive:
 * - Is the ONLY way UI renders a monetary figure (DS-3)
 * - `provenance` is a required prop — type error to omit it
 * - Estimates render with "≈" prefix (BR-CALC-014)
 * - accessibilityLabel includes both formatted value AND provenance label
 *
 * Uses real Money.of() from @eltizamati/domain — no mocking of domain VOs.
 */
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Money } from '@eltizamati/domain'
import type { Provenance } from '@eltizamati/domain'
import { Amount } from '../primitives/Amount'

// ── Test fixtures ──────────────────────────────────────────────────────────────

const officialProvenance: Provenance = {
  source: 'official',
  providerId: 'openbanking:roya',
  observedAt: '2026-07-01T00:00:00Z',
  recordedAt: '2026-07-01T00:00:00Z',
}

const estimateProvenance: Provenance = {
  source: 'estimate',
  sourceReference: 'run-001',
  observedAt: '2026-07-01T00:00:00Z',
  recordedAt: '2026-07-01T00:00:00Z',
}

const demoProvenance: Provenance = {
  source: 'demo',
  providerId: 'demo-seed',
  observedAt: '2026-07-01T00:00:00Z',
  recordedAt: '2026-07-01T00:00:00Z',
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Amount', () => {
  // ── Official precision ─────────────────────────────────────────────────────

  it('renders formatted official amount', () => {
    const money = Money.of('1500.750', 'JOD')
    const { getByText } = render(
      <Amount money={money} provenance={officialProvenance} precision="official" />,
    )
    // formatMoneyOfficial: thousands + 3dp for JOD; t() returns key in test env
    expect(getByText(/1,500\.75/)).toBeTruthy()
  })

  it('renders zero amount as official', () => {
    const money = Money.zero('JOD')
    const { getByText } = render(
      <Amount money={money} provenance={officialProvenance} precision="official" />,
    )
    expect(getByText(/0/)).toBeTruthy()
  })

  // ── Estimate precision (BR-CALC-014) ──────────────────────────────────────

  it('renders estimate amount with ≈ prefix', () => {
    const money = Money.of('1234.567', 'JOD')
    const { getByText } = render(
      <Amount money={money} provenance={estimateProvenance} precision="estimate" />,
    )
    // formatMoneyEstimate: whole-unit rounding + ≈ prefix
    expect(getByText(/≈/)).toBeTruthy()
  })

  it('rounds estimate to whole units', () => {
    const money = Money.of('999.600', 'JOD')
    const { getByText } = render(
      <Amount money={money} provenance={estimateProvenance} precision="estimate" />,
    )
    // 999.600 rounds up to 1,000
    expect(getByText(/1,000/)).toBeTruthy()
  })

  // ── Provenance in accessibilityLabel (DS-4 / a11y requirement) ────────────

  it('accessibilityLabel includes provenance key — required for screen readers', () => {
    const money = Money.of('500', 'JOD')
    const { getByLabelText } = render(
      <Amount money={money} provenance={officialProvenance} precision="official" />,
    )
    // a11y: label = "formatted — provenance label"
    // In test env, t() returns the key, so label contains the provenance i18n key
    expect(getByLabelText(/provenance\.official/)).toBeTruthy()
  })

  it('accessibilityLabel includes estimate provenance key', () => {
    const money = Money.of('250', 'JOD')
    const { getByLabelText } = render(
      <Amount money={money} provenance={estimateProvenance} precision="estimate" />,
    )
    expect(getByLabelText(/provenance\.estimate/)).toBeTruthy()
  })

  it('accessibilityLabel includes demo provenance key', () => {
    const money = Money.of('100', 'JOD')
    const { getByLabelText } = render(<Amount money={money} provenance={demoProvenance} />)
    expect(getByLabelText(/provenance\.demo/)).toBeTruthy()
  })

  // ── testID ─────────────────────────────────────────────────────────────────

  it('renders testID for automation', () => {
    const money = Money.of('100', 'JOD')
    const { getByTestId } = render(
      <Amount money={money} provenance={officialProvenance} testID="amount-balance" />,
    )
    expect(getByTestId('amount-balance')).toBeTruthy()
  })

  // ── Pressable variant ──────────────────────────────────────────────────────

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const money = Money.of('750', 'JOD')
    const { getByRole } = render(
      <Amount money={money} provenance={officialProvenance} onPress={onPress} />,
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('has accessibilityRole="button" when onPress is provided', () => {
    const money = Money.of('750', 'JOD')
    const { getByRole } = render(
      <Amount money={money} provenance={officialProvenance} onPress={() => undefined} />,
    )
    // a11y: announced as interactive when SCR-EXPLAIN link is wired
    expect(getByRole('button')).toBeTruthy()
  })

  it('does NOT have button role when onPress is absent', () => {
    const money = Money.of('750', 'JOD')
    const { queryByRole } = render(<Amount money={money} provenance={officialProvenance} />)
    expect(queryByRole('button')).toBeNull()
  })
})
