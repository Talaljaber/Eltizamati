import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'
import { Screen, Text, SectionHeader, space } from '@/core/design-system'
import { CONSENT_VERSION } from '@/features/auth/api/use-record-consent'

const SECTION_KEYS = [
  'about',
  'demoVsPersonal',
  'dataWeStore',
  'dataSources',
  'communications',
  'notAdvice',
  'security',
  'yourRights',
  'accountDeletion',
  'changes',
  'contact',
] as const

export default function LegalDocScreen() {
  const { t } = useTranslation()

  return (
    <Screen maxWidth="readable">
      <Stack.Screen options={{ title: t('legalDoc.title') }} />
      <Text variant="title">{t('legalDoc.title')}</Text>
      <Text variant="bodySmall" color="secondary">
        {t('legalDoc.version', { version: CONSENT_VERSION })}
      </Text>

      {SECTION_KEYS.map((key) => (
        <View key={key} style={styles.section}>
          <SectionHeader title={t(`legalDoc.sections.${key}.heading`)} />
          <Text variant="body" color="secondary">
            {t(`legalDoc.sections.${key}.body`)}
          </Text>
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: {
    marginTop: space[5],
  },
})
