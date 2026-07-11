import { View, StyleSheet } from 'react-native'
import { Text } from './Text'
import { Button } from './Button'
import { space } from '../tokens'

export interface EmptyStateProps {
  readonly title: string
  readonly subtitle?: string
  readonly ctaLabel?: string
  readonly onCta?: () => void
  readonly testID?: string
}

/**
 * EmptyState — centered illustration placeholder, title, subtitle, and optional CTA.
 * Used for all list/screen empty states (Home, Obligations, etc.).
 */
export function EmptyState({ title, subtitle, ctaLabel, onCta, testID }: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID} accessible accessibilityRole="none">
      {/* Illustration placeholder — replaced in Phase 9 polish */}
      <Text variant="display" align="center">
        {'📋'}
      </Text>
      <View style={styles.textGroup}>
        <Text variant="heading" align="center">
          {title !== undefined && title !== '' ? title : ''}
        </Text>
        {subtitle !== undefined && subtitle !== '' ? (
          <Text variant="body" color="secondary" align="center">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {ctaLabel !== undefined && ctaLabel !== '' && onCta ? (
        <View style={styles.cta}>
          <Button variant="primary" onPress={onCta} label={ctaLabel} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[7],
    paddingVertical: space[9],
  },
  textGroup: {
    marginTop: space[3],
    gap: space[2],
    alignItems: 'center',
  },
  cta: {
    marginTop: space[4],
    alignSelf: 'stretch',
  },
})
