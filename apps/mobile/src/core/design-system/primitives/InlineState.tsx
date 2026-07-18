import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { Skeleton } from './Skeleton'
import { useTheme } from '../use-theme'
import { space } from '../tokens'

export type InlineStateKind = 'loading' | 'error' | 'empty' | 'unsupported' | 'refused'

export interface InlineStateProps {
  readonly kind: InlineStateKind
  readonly message: string
  readonly testID?: string
}

const ICON_BY_KIND: Record<InlineStateKind, keyof typeof Ionicons.glyphMap> = {
  loading: 'hourglass-outline',
  error: 'alert-circle-outline',
  empty: 'file-tray-outline',
  unsupported: 'information-circle-outline',
  refused: 'remove-circle-outline',
}

/**
 * InlineState — a compact, consistent status line for analytical screens
 * (schedule, scenario, rate-impact, ...) that previously rendered ad-hoc
 * one-line Text for loading/error/empty/unsupported/refused states.
 */
export function InlineState({ kind, message, testID }: InlineStateProps) {
  const theme = useTheme()
  const color = kind === 'error' ? 'critical' : 'secondary'

  return (
    <View
      style={styles.row}
      testID={testID}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      {kind === 'loading' ? (
        <Skeleton width={16} height={16} borderRadius={8} />
      ) : (
        <Ionicons
          name={ICON_BY_KIND[kind]}
          size={16}
          color={kind === 'error' ? theme.critical : theme.textSecondary}
          accessibilityElementsHidden
        />
      )}
      <Text variant="bodySmall" color={color}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[2],
  },
})
