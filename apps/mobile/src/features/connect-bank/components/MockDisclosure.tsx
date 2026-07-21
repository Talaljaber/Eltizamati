import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Text, space, useTheme } from '@/core/design-system'

/**
 * Permanent mock disclosure — required on every screen of the bank-connect
 * flow (connect-plan.md #10, US-017/C-07): using real Jordanian bank names
 * with a realistic sign-in must never be allowed to imply a live bank
 * connection or affiliation.
 */
export function MockDisclosure() {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <View
      style={[styles.banner, { backgroundColor: theme.cautionSoft, borderColor: theme.caution }]}
      accessible
      accessibilityRole="none"
      accessibilityLabel={t('connectBank.mockDisclosure')}
    >
      <Ionicons
        name="information-circle-outline"
        size={16}
        color={theme.caution}
        accessibilityElementsHidden
      />
      <View style={styles.text}>
        <Text variant="bodySmall" color="caution">
          {t('connectBank.mockDisclosure')}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    padding: space[3],
    borderRadius: 10,
    borderWidth: 1,
  },
  text: {
    flex: 1,
  },
})
