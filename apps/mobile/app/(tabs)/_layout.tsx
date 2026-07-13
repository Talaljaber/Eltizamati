import { Tabs, Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'

export default function TabLayout() {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <RequireRepositories>
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
                  hitSlop={8}
                  style={{ marginHorizontal: 16 }}
                >
                  <Ionicons name="settings-outline" size={24} color={theme.textPrimary} />
                </Pressable>
              </Link>
            ),
          }}
        />
        <Tabs.Screen
          name="obligations"
          options={{
            title: t('tabs.obligations'),
            headerRight: () => (
              <Link href="/obligation/add" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('obligationForm.addTitle')}
                  hitSlop={8}
                  style={{ marginHorizontal: 16 }}
                >
                  <Ionicons name="add" size={28} color={theme.textPrimary} />
                </Pressable>
              </Link>
            ),
          }}
        />
        <Tabs.Screen
          name="learn/index"
          options={{
            title: t('tabs.learn'),
          }}
        />
      </Tabs>
    </RequireRepositories>
  )
}
