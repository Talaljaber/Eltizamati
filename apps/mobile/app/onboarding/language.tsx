/**
 * SCR-ONB-LANG — Language selection (step 1 of 4).
 *
 * Sets the app locale and RTL direction, then navigates to intro.
 * No sign-in, no network. Pure AsyncStorage/i18n change.
 */

import { View, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Text,
  space,
  layout,
  useTheme,
  useResponsiveLayout,
  radius,
  minTouchTarget,
} from '@/core/design-system'
import { changeLanguage } from '@/i18n'

export default function LanguageScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { isWideWeb } = useResponsiveLayout()

  async function selectLanguage(lang: 'en' | 'ar') {
    await changeLanguage(lang)
    router.replace('/onboarding/intro')
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.content, isWideWeb && styles.contentWide]}>
        <View style={styles.header}>
          <Text variant="display" align="center">
            {'🌐'}
          </Text>
          <Text variant="title" align="center">
            {t('onboarding.languageTitle')}
          </Text>
          <Text variant="body" color="secondary" align="center">
            {t('onboarding.languageSubtitle')}
          </Text>
        </View>

        <View style={styles.options}>
          <LanguageOption
            nativeLabel="English"
            onPress={() => {
              void selectLanguage('en')
            }}
            testID="language-option-en"
            theme={theme}
          />
          <LanguageOption
            nativeLabel="العربية"
            onPress={() => {
              void selectLanguage('ar')
            }}
            testID="language-option-ar"
            theme={theme}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

function LanguageOption({
  nativeLabel,
  onPress,
  testID,
  theme,
}: {
  nativeLabel: string
  onPress: () => void
  testID: string
  theme: ReturnType<typeof useTheme>
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={nativeLabel}
      style={({ pressed }) => [
        styles.languageBtn,
        {
          backgroundColor: pressed ? theme.bgSubtle : theme.bgElevated,
          borderColor: theme.border,
        },
      ]}
    >
      <Text variant="heading" align="center">
        {nativeLabel}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: space[6],
    justifyContent: 'center',
    gap: space[8],
  },
  contentWide: { width: '100%', maxWidth: layout.readableMaxWidth, alignSelf: 'center' },
  header: {
    gap: space[3],
    alignItems: 'center',
  },
  options: {
    gap: space[4],
  },
  languageBtn: {
    paddingVertical: space[5],
    paddingHorizontal: space[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: minTouchTarget * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
