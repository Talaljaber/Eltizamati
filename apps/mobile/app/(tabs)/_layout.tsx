import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function TabLayout() {
  const { t } = useTranslation()

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
        }}
      />
      <Tabs.Screen
        name="obligations"
        options={{
          title: t('tabs.obligations'),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t('tabs.learn'),
        }}
      />
    </Tabs>
  )
}
