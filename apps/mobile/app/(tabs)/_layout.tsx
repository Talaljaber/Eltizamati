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
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.brand },
          headerTitleStyle: { color: theme.textOnBrand, fontWeight: '600', fontSize: 18 },
          headerTintColor: theme.textOnBrand,
          tabBarActiveTintColor: theme.brand,
          tabBarInactiveTintColor: theme.textTertiary,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
            headerRight: () => (
              <Link href="/profile" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.title')}
                  hitSlop={8}
                  style={{ marginHorizontal: 16 }}
                >
                  <Ionicons name="person-circle-outline" size={27} color={theme.textOnBrand} />
                </Pressable>
              </Link>
            ),
          }}
        />
        <Tabs.Screen
          name="obligations"
          options={{
            title: t('tabs.obligations'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
            headerRight: () => (
              <Link href="/obligation/add" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('obligationForm.addTitle')}
                  hitSlop={8}
                  style={{ marginHorizontal: 16 }}
                >
                  <Ionicons name="add" size={28} color={theme.textOnBrand} />
                </Pressable>
              </Link>
            ),
          }}
        />
        <Tabs.Screen
          name="loans"
          options={{
            title: t('tabs.loans'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash-outline" size={size} color={color} />
            ),
            headerRight: () => (
              <Link href="/loan-application/apply" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('loanApplication.applyTitle')}
                  hitSlop={8}
                  style={{ marginHorizontal: 16 }}
                >
                  <Ionicons name="add" size={28} color={theme.textOnBrand} />
                </Pressable>
              </Link>
            ),
          }}
        />
        <Tabs.Screen
          name="learn/index"
          options={{
            title: t('tabs.learn'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </RequireRepositories>
  )
}
