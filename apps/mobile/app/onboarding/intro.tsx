/**
 * SCR-ONB-INTRO — App intro / value proposition (step 2 of 4).
 */

import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Button, space, layout, useTheme, useResponsiveLayout } from '@/core/design-system'

export default function IntroScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { isWideWeb } = useResponsiveLayout()

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.content, isWideWeb && styles.contentWide]}>
        <View style={styles.hero}>
          {/* Illustration placeholder — Phase 9 polish */}
          <Text variant="display" align="center">
            {'📊'}
          </Text>
        </View>

        <View style={styles.copy}>
          <Text variant="title" align="center">
            {t('onboarding.introTitle')}
          </Text>
          <Text variant="body" color="secondary" align="center">
            {t('onboarding.introBody')}
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureRow icon="🔍" label={t('onboarding.introFeatureProvenance')} />
          <FeatureRow icon="📐" label={t('onboarding.introFeatureMath')} />
          <FeatureRow icon="✈️" label={t('onboarding.introFeatureOffline')} />
        </View>

        <Button
          variant="primary"
          onPress={() => router.push('/onboarding/consent')}
          testID="intro-continue"
          label={t('common.continue')}
        />
      </View>
    </SafeAreaView>
  )
}

function FeatureRow({ icon, label }: { icon: string; label: string }) {
  const theme = useTheme()

  return (
    <View
      style={[styles.featureRow, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}
    >
      <Text variant="body">{icon}</Text>
      <Text variant="bodySmall" color="secondary">
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: space[6],
    paddingVertical: space[6],
    justifyContent: 'center',
    gap: space[6],
  },
  contentWide: { width: '100%', maxWidth: layout.readableMaxWidth, alignSelf: 'center' },
  hero: {
    alignItems: 'center',
  },
  copy: {
    gap: space[3],
    alignItems: 'center',
  },
  features: {
    gap: space[2],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: 12,
    borderWidth: 1,
  },
})
