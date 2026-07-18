/**
 * SCR-ONB-CONSENT — Demo disclaimer / consent acknowledgment (step 3 of 4).
 *
 * User must explicitly tick the checkbox before proceeding (FR-CONSENT-001-local-demo).
 * No Supabase involved — local AsyncStorage only for demo mode consent.
 */

import { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Text,
  Button,
  space,
  layout,
  useTheme,
  useResponsiveLayout,
  radius,
  minTouchTarget,
} from '@/core/design-system'
import { acknowledgeLocalConsent } from '@/features/consent/consent-policy'
import { useEntryCompletion } from '@/features/consent/hooks/use-entry-completion'

export default function ConsentScreen() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const { isWideWeb } = useResponsiveLayout()
  const [acknowledged, setAcknowledged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const { next } = useLocalSearchParams<{ next?: string }>()
  const { completeDemoEntry, resumePersonalEntry } = useEntryCompletion()
  const personal = next === 'personal'

  async function handleContinue() {
    setSaving(true)
    setSaveFailed(false)
    const result = await acknowledgeLocalConsent(i18n.language === 'ar' ? 'ar' : 'en')
    if (!result.ok) {
      setSaveFailed(true)
      setSaving(false)
      return
    }
    if (next === 'demo') {
      const completion = await completeDemoEntry()
      if (!completion.ok) setSaveFailed(true)
    } else if (next === 'personal') {
      const completion = await resumePersonalEntry()
      if (!completion.ok) setSaveFailed(true)
    } else {
      router.replace('/onboarding/mode')
    }
    setSaving(false)
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.content, isWideWeb && styles.contentWide]}>
        <View style={styles.header}>
          <Text variant="display" align="center">
            {'⚠️'}
          </Text>
          <Text variant="title" align="center">
            {t(personal ? 'onboarding.personalConsentTitle' : 'onboarding.consentTitle')}
          </Text>
        </View>

        <View
          style={[
            styles.consentBox,
            { borderColor: theme.border, backgroundColor: theme.bgElevated },
          ]}
        >
          <Text variant="body" color="secondary">
            {t(personal ? 'onboarding.personalConsentBody' : 'onboarding.consentBody')}
          </Text>
        </View>

        <Pressable
          onPress={() => setAcknowledged((v) => !v)}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          accessibilityLabel={t(
            personal ? 'onboarding.personalConsentAcknowledge' : 'onboarding.consentAcknowledge',
          )}
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
            <Text variant="body">
              {t(
                personal
                  ? 'onboarding.personalConsentAcknowledge'
                  : 'onboarding.consentAcknowledge',
              )}
            </Text>
          </View>
        </Pressable>

        <Button
          variant="primary"
          onPress={() => {
            void handleContinue()
          }}
          disabled={!acknowledged}
          loading={saving}
          testID="consent-continue"
          label={t('common.continue')}
        />
        {saveFailed ? (
          <Text variant="bodySmall" color="critical" testID="consent-save-error">
            {t('error.storage')}
          </Text>
        ) : null}
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
  contentWide: { width: '100%', maxWidth: layout.readableMaxWidth, alignSelf: 'center' },
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
