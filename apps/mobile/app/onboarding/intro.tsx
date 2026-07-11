/**
 * SCR-ONB-INTRO — App intro / value proposition (step 2 of 4).
 */

import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Button, space, useTheme } from '@/core/design-system'

export default function IntroScreen() {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
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
          <FeatureRow
            icon="🔍"
            label="Every figure labeled by source and confidence"
            labelAr="كل رقم مُصنَّف حسب مصدره"
          />
          <FeatureRow
            icon="📐"
            label="Honest financial math — no hidden rounding"
            labelAr="حساب مالي شفاف بلا تقريب مخفي"
          />
          <FeatureRow
            icon="✈️"
            label="Works completely offline"
            labelAr="يعمل بالكامل بدون إنترنت"
          />
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

function FeatureRow({ icon, label, labelAr }: { icon: string; label: string; labelAr: string }) {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const theme = useTheme()

  return (
    <View
      style={[styles.featureRow, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}
    >
      <Text variant="body">{icon}</Text>
      <Text variant="bodySmall" color="secondary">
        {isAr ? labelAr : label}
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
