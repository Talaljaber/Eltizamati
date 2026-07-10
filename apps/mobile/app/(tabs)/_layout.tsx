import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function TabLayout() {
  const { t } = useTranslation()

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.dashboard'),
        }}
      />
      <Tabs.Screen
        name="simulator"
        options={{
          title: t('tabs.simulator'),
        }}
      />
    </Tabs>
  )
}
