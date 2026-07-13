import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { useTheme } from '../use-theme'
import { space } from '../tokens'

export interface DemoBannerProps {
  /** If true, the banner is shown. Default: true. */
  readonly visible?: boolean
  readonly testID?: string
}

/**
 * DemoBanner — persistent top banner stating "Demonstration data — not real accounts."
 *
 * Rules (mvp-scope §4, C-07):
 *   - Always visible in demo mode — cannot be dismissed permanently.
 *   - Copy is bilingual via i18n key 'demo.banner.message'.
 *   - High-contrast caution palette for visibility (design-system §1 semantic colors).
 *   - Accessibility: announced as a "notification" region.
 *
 * Place once at the top of each demo-mode screen or at the root layout
 * in demo mode so it's present on every tab.
 */
export function DemoBanner({ visible = true, testID }: DemoBannerProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  if (!visible) return null

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.cautionSoft, borderBottomColor: theme.caution },
      ]}
      testID={testID}
      accessible
      accessibilityRole="none"
      accessibilityLabel={t('demo.banner.message')}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Ionicons
          name="information-circle-outline"
          size={14}
          color={theme.caution}
          accessibilityElementsHidden
        />
        <Text variant="caption" color="caution" align="center">
          {t('demo.banner.message')}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
  },
})
