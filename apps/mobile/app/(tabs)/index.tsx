import { useTranslation } from 'react-i18next'
import { Screen, Text } from '@/core/design-system'

export default function HomeScreen() {
  const { t } = useTranslation()

  return (
    <Screen>
      <Text variant="title">{t('home.greeting')}</Text>
      <Text variant="body" color="secondary">
        {t('home.subtitle')}
      </Text>
    </Screen>
  )
}
