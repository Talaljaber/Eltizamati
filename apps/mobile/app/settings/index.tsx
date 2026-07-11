import { useTranslation } from 'react-i18next'
import { Screen, Text, Button } from '@/core/design-system'
import { changeLanguage } from '@/i18n'

export default function SettingsScreen() {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en'
    changeLanguage(nextLang).catch(() => {
      // changeLanguage already warns internally when it cannot auto-reload.
    })
  }

  return (
    <Screen>
      <Text variant="title">{t('settings.title')}</Text>
      <Text variant="bodySmall" color="secondary">
        {t('settings.languageLabel')}
      </Text>
      <Button label={t('common.toggleLanguage')} onPress={toggleLanguage} variant="secondary" />
    </Screen>
  )
}
