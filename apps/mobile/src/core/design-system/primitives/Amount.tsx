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
  const currencyLabel = t(`currency.${money.currency.toLowerCase()}`, {
    defaultValue: money.currency,
  })
  const formatted =
    precision === 'estimate'
      ? formatMoneyEstimate(money, currencyLabel)
      : formatMoneyOfficial(money, currencyLabel)
  const provenanceLabel = t(provenanceLabelKey[provenance.source])
  const accessibilityLabel = `${formatted} — ${provenanceLabel}`

  const body = (
    <Text
      variant={variant}
      color={precision === 'estimate' ? 'secondary' : 'primary'}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {formatted}
      {precision === 'estimate' ? (
        <Text variant="caption" color="secondary">
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
