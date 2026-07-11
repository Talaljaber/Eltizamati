/**
 * SCR-ONB-DATA — Mode selection (step 4 of 4).
 *
 * Three options: demo (active), manual (coming soon), account (coming soon).
 * Selecting demo: persists dataMode='demo', marks onboarding complete,
 * triggers seed import, navigates to /(tabs)/.
 *
 * Manual and account modes are shown as disabled with honest "Coming soon" labels
 * (FR-ONB-003, C-07: no false capability promises).
 *
 * No Supabase interaction in this screen.
 */

import { useState } from 'react'
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Button, space, useTheme, radius, minTouchTarget } from '@/core/design-system'
import { setDataMode, setOnboardingComplete } from '@/features/demo/stores/demo-mode-store'

export default function ModeScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const [loading, setLoading] = useState(false)

  async function handleSelectDemo() {
    setLoading(true)
    try {
      await setDataMode('demo')
      await setOnboardingComplete()
      // Navigate to main app — seed import happens in root layout
      router.replace('/(tabs)/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="title" align="center">
            {t('onboarding.modeTitle')}
          </Text>
        </View>

        <View style={styles.options}>
          {/* Demo mode — fully enabled */}
          <ModeCard
            icon="🎯"
            label={t('onboarding.modeDemo')}
            subtitle={t('onboarding.modeDemoSubtitle')}
            onPress={() => {
              void handleSelectDemo()
            }}
            enabled
            selected
            testID="mode-demo"
            theme={theme}
          />

          {/* Manual entry — honestly disabled */}
          <ModeCard
            icon="✏️"
            label={t('onboarding.modeManual')}
            subtitle={t('onboarding.modeManualSubtitle')}
            badge={t('onboarding.modeManualBadge')}
            onPress={() => undefined}
            enabled={false}
            testID="mode-manual"
            theme={theme}
          />

          {/* Account — honestly disabled */}
          <ModeCard
            icon="🔐"
            label={t('onboarding.modeAccount')}
            subtitle={t('onboarding.modeAccountSubtitle')}
            badge={t('onboarding.modeAccountBadge')}
            onPress={() => undefined}
            enabled={false}
            testID="mode-account"
            theme={theme}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={theme.brand} />
        ) : (
          <Button
            variant="primary"
            onPress={() => {
              void handleSelectDemo()
            }}
            testID="mode-start-demo"
            label={t('onboarding.startDemo')}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

interface ModeCardProps {
  icon: string
  label: string
  subtitle: string
  badge?: string
  onPress: () => void
  enabled: boolean
  selected?: boolean
  testID: string
  theme: ReturnType<typeof useTheme>
}

function ModeCard({
  icon,
  label,
  subtitle,
  badge,
  onPress,
  enabled,
  selected,
  testID,
  theme,
}: ModeCardProps) {
  return (
    <Pressable
      onPress={enabled ? onPress : undefined}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled, selected }}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected === true ? theme.brand : theme.border,
          backgroundColor: pressed && enabled ? theme.bgSubtle : theme.bgElevated,
          opacity: enabled ? 1 : 0.6,
        },
      ]}
    >
      <View style={styles.cardIconRow}>
        <Text variant="heading">{icon}</Text>
        <View style={styles.cardText}>
          <View style={styles.cardLabelRow}>
            <Text variant="body">{label}</Text>
            {badge !== undefined && badge !== '' ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.bgSubtle, borderColor: theme.border },
                ]}
              >
                <Text variant="caption" color="tertiary">
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="bodySmall" color="secondary">
            {subtitle}
          </Text>
        </View>
      </View>
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
    paddingVertical: space[6],
    justifyContent: 'center',
    gap: space[6],
  },
  header: {
    alignItems: 'center',
  },
  options: {
    gap: space[3],
  },
  card: {
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    minHeight: minTouchTarget * 2,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
  },
  cardText: {
    flex: 1,
    gap: space[1],
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: space[2],
    paddingVertical: 2,
  },
})
