import type { ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import type { Money, Provenance } from '@eltizamati/domain'
import { Text } from './Text'
import { Amount } from './Amount'
import { ProvenanceBadge } from './ProvenanceBadge'
import { ExplainLink } from './ExplainLink'
import { space } from '../tokens'

export interface HeroAmountSupportingMetric {
  readonly label: string
  readonly value: ReactNode
}

export interface HeroAmountProps {
  readonly label: string
  readonly money: Money
  readonly provenance: Provenance
  readonly precision?: 'official' | 'estimate'
  /** Opens an explanation of how this figure was derived. */
  readonly onExplain?: () => void
  /** 2–3 compact supporting metrics rendered under the figure. */
  readonly supporting?: readonly HeroAmountSupportingMetric[]
  readonly testID?: string
}

/**
 * HeroAmount — the single dominant figure a screen is built around
 * (visual-direction.md: "one dominant figure per screen"). Deliberately not
 * wrapped in a Card — a hero figure is the screen's headline, not a grouped
 * module (anti-pattern: card-around-everything).
 */
export function HeroAmount({
  label,
  money,
  provenance,
  precision = 'official',
  onExplain,
  supporting,
  testID,
}: HeroAmountProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text variant="bodySmall" color="secondary" align="center">
        {label}
      </Text>
      <Amount variant="amountHero" money={money} provenance={provenance} precision={precision} />
      <View style={styles.metaRow}>
        <ProvenanceBadge source={provenance.source} />
        {onExplain ? <ExplainLink onPress={onExplain} /> : null}
      </View>
      {supporting !== undefined && supporting.length > 0 ? (
        <View style={styles.supportingRow}>
          {supporting.map((metric, index) => (
            <View key={index} style={styles.supportingItem}>
              <Text variant="caption" color="secondary" align="center">
                {metric.label}
              </Text>
              {metric.value}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: space[2],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  supportingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space[6],
    marginTop: space[3],
  },
  supportingItem: {
    alignItems: 'center',
    gap: space[1],
  },
})
