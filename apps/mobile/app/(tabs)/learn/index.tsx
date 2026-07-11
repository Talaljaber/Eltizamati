import { useTranslation } from 'react-i18next'
import { Screen, Text } from '@/core/design-system'

export default function LearnScreen() {
  const { t } = useTranslation()

  return (
    <Screen>
      <Text variant="title">{t('learn.title')}</Text>
      <Text variant="body" color="secondary">
        {t('learn.subtitle')}
      </Text>
    </Screen>
  )
}
