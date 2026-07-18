import { Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { Money, Provenance, SourceClass } from '@eltizamati/domain'
import { formatMoneyEstimate, formatMoneyOfficial } from '../../formatting/format-money'
import { Text, type TextVariant } from './Text'

export interface AmountProps {
  readonly money: Money
  /** Required — it is a type error to render an amount without provenance (design-system.md §2). */
  readonly provenance: Provenance
  readonly precision?: 'official' | 'estimate'
  readonly variant?: TextVariant
  /** Opens the calculation explanation (SCR-EXPLAIN) — wired by callers once that screen exists. */
  readonly onPress?: () => void
  readonly testID?: string
}

const provenanceLabelKey: Record<SourceClass, string> = {
  official: 'provenance.official',
  bureau: 'provenance.bureau',
  userEntered: 'provenance.userEntered',
  estimate: 'provenance.estimate',
  demo: 'provenance.demo',
}

/**
 * Amount primitive — the only way UI renders a monetary figure (DS-3).
 * Every material figure carries provenance; estimates render as estimates (BR-CALC-014).
 */
export function Amount({
  money,
  provenance,
  precision = 'official',
  variant = 'amountMd',
  onPress,
  testID,
}: AmountProps) {
  const { t } = useTranslation()
  // Provenance is authoritative: an engine estimate must never be made to look
  // official by an inconsistent caller-selected display precision.
  const effectivePrecision = provenance.source === 'estimate' ? 'estimate' : precision
  const currencyLabel = t(`currency.${money.currency.toLowerCase()}`, {
    defaultValue: money.currency,
  })
  const formatted =
    effectivePrecision === 'estimate'
      ? formatMoneyEstimate(money, currencyLabel)
      : formatMoneyOfficial(money, currencyLabel)
  const provenanceLabel = t(provenanceLabelKey[provenance.source])
  const accessibilityLabel = `${formatted} — ${provenanceLabel}`

  const body = (
    <Text
      variant={variant}
      // The figure itself stays full-contrast even when estimated — an
      // estimate is a labeled fact, not a lesser one; the "≈" prefix plus the
      // provenance suffix below carry the distinction (never dim the number).
      color="primary"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {formatted}
      {effectivePrecision === 'estimate' ? (
        <Text variant="caption" color="estimate">
          {' '}
          {provenanceLabel}
        </Text>
      ) : null}
    </Text>
  )

  if (!onPress) return body

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  )
}
