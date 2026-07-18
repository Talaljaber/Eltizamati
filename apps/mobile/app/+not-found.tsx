import { Link, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/core/design-system/primitives/Screen'
import { Text } from '@/core/design-system/primitives/Text'

export default function NotFoundScreen() {
  const { t } = useTranslation()

  return (
    <>
      <Stack.Screen options={{ title: t('navigation.notFound') }} />
      <Screen testID="not-found-screen" maxWidth="readable">
        <Text variant="title" align="center">
          {t('errors.screenNotFound.title')}
        </Text>
        <Link href="/(tabs)/" style={{ marginTop: 24, alignSelf: 'center' }}>
          <Text variant="body" color="primary">
            {t('errors.screenNotFound.action')}
          </Text>
        </Link>
      </Screen>
    </>
  )
}
