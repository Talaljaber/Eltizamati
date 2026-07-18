import { I18nManager } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { ListRow } from './ListRow'
import { useTheme } from '../use-theme'

export interface NavRowProps {
  readonly icon: keyof typeof Ionicons.glyphMap
  readonly label: string
  readonly onPress: () => void
  readonly testID?: string
}

/**
 * NavRow — a single navigation entry inside a NavGroup: leading icon, label,
 * and a trailing chevron that flips direction under RTL.
 */
export function NavRow({ icon, label, onPress, testID }: NavRowProps) {
  const theme = useTheme()
  const chevronIcon: keyof typeof Ionicons.glyphMap = I18nManager.isRTL
    ? 'chevron-back-outline'
    : 'chevron-forward-outline'
  return (
    <ListRow
      onPress={onPress}
      accessibilityLabel={label}
      leading={<Ionicons name={icon} size={20} color={theme.textSecondary} />}
      trailing={<Ionicons name={chevronIcon} size={18} color={theme.textTertiary} />}
      testID={testID}
    >
      <Text variant="body">{label}</Text>
    </ListRow>
  )
}
