/**
 * SCR-ONB-CONSENT — Demo disclaimer / consent acknowledgment (step 3 of 4).
 *
 * User must explicitly tick the checkbox before proceeding (FR-CONSENT-001-local-demo).
 * No Supabase involved — local AsyncStorage only for demo mode consent.
 */

import { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Button, space, useTheme, radius, minTouchTarget } from '@/core/design-system'

export default function ConsentScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const [acknowledged, setAcknowledged] = useState(false)

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="display" align="center">
            {'⚠️'}
          </Text>
          <Text variant="title" align="center">
            {t('onboarding.consentTitle')}
          </Text>
        </View>

        <View
          style={[
            styles.consentBox,
            { borderColor: theme.border, backgroundColor: theme.bgElevated },
          ]}
        >
          <Text variant="body" color="secondary">
            {t('onboarding.consentBody')}
          </Text>
        </View>

        <Pressable
          onPress={() => setAcknowledged((v) => !v)}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          accessibilityLabel={t('onboarding.consentAcknowledge')}
          testID="consent-checkbox"
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: acknowledged ? theme.brand : theme.border,
                backgroundColor: acknowledged ? theme.brand : 'transparent',
              },
            ]}
          >
            {acknowledged ? (
              <Text variant="caption" color="primary" align="center">
                {'✓'}
              </Text>
            ) : null}
          </View>
          <View style={styles.checkLabel}>
            <Text variant="body">{t('onboarding.consentAcknowledge')}</Text>
          </View>
        </Pressable>

        <Button
          variant="primary"
          onPress={() => router.push('/onboarding/mode')}
          disabled={!acknowledged}
          testID="consent-continue"
          label={t('common.continue')}
        />
      </View>
    </SafeAreaView>
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
    gap: space[3],
  },
  consentBox: {
    padding: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    minHeight: minTouchTarget,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkLabel: {
    flex: 1,
  },
})
