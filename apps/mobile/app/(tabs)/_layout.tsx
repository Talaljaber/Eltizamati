import { Tabs, Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, Text } from 'react-native'

export default function TabLayout() {
  const { t } = useTranslation()

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerRight: () => (
            <Link href="/settings/" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('navigation.settings')}
                style={{ marginRight: 16 }}
              >
                <Text style={{ fontSize: 24 }}>⚙️</Text>
              </Pressable>
            </Link>
          ),
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
