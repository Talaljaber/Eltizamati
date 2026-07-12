import { useState } from 'react'
import { Alert, View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Screen, Text, Button, space } from '@/core/design-system'
import { changeLanguage } from '@/i18n'
import { useRepositoriesIfAvailable } from '@/features/repositories/hooks/use-repositories'
import type { DemoRepositories } from '@/services/repositories/demo'
import { ImportService } from '@/services/import-service'
import { DemoSeedProvider } from '@/services/demo-seed-provider'

export default function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const repos = useRepositoriesIfAvailable()
  const queryClient = useQueryClient()
  const [isResetting, setIsResetting] = useState(false)

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en'
    changeLanguage(nextLang).catch(() => {
      // changeLanguage already warns internally when it cannot auto-reload.
    })
  }

  // `reset()` only exists on the demo repository family (FR-SET-005) —
  // personal-mode Supabase repositories have no local state to wipe.
  const canResetDemo = repos !== null && typeof repos.reset === 'function'

  async function performReset() {
    if (repos === null || typeof repos.reset !== 'function') return
    setIsResetting(true)
    try {
      const seed = new DemoSeedProvider().provide()
      await new ImportService().resetDemo(seed, repos as DemoRepositories)
      // Several demo queries use staleTime: Infinity ("demo data never goes
      // stale") — that assumption only holds without a reset button, so the
      // cache must be invalidated explicitly for screens to show the
      // freshly re-seeded data instead of what they'd already cached.
      await queryClient.invalidateQueries()
    } finally {
      setIsResetting(false)
    }
  }

  function handleResetDemo() {
    Alert.alert(t('settings.resetDemoConfirmTitle'), t('settings.resetDemoConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.resetDemoConfirmAction'),
        style: 'destructive',
        onPress: () => {
          void performReset()
        },
      },
    ])
  }

  return (
    <Screen>
      <Text variant="title">{t('settings.title')}</Text>

      <View style={styles.section}>
        <Text variant="bodySmall" color="secondary">
          {t('settings.languageLabel')}
        </Text>
        <Button label={t('common.toggleLanguage')} onPress={toggleLanguage} variant="secondary" />
      </View>

      {canResetDemo ? (
        <View style={styles.section}>
          <Text variant="bodySmall" color="secondary">
            {t('settings.resetDemoLabel')}
          </Text>
          <Button
            label={t('settings.resetDemoButton')}
            onPress={handleResetDemo}
            variant="destructive"
            loading={isResetting}
            testID="settings-reset-demo"
          />
        </View>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: space[3],
    marginTop: space[5],
  },
})
