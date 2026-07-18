import { Tabs, Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { I18nManager, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, useResponsiveLayout } from '@/core/design-system'
import { RequireRepositories } from '@/features/repositories/components/RequireRepositories'
import { AppSidebar } from '@/features/navigation/components/AppSidebar'

export default function TabLayout() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { isWideWeb } = useResponsiveLayout()

  // On wide web, primary nav moves into a persistent AppSidebar and the tall
  // brand header shrinks to a slim, light top bar — native and narrow web
  // are unaffected (bottom tab bar + teal header, exactly as before).
  const headerStyle = isWideWeb
    ? { backgroundColor: theme.bgElevated, borderBottomWidth: 1, borderBottomColor: theme.border }
    : { backgroundColor: theme.brand }
  const headerTitleStyle = isWideWeb
    ? { color: theme.textPrimary, fontWeight: '600' as const, fontSize: 18 }
    : { color: theme.textOnBrand, fontWeight: '600' as const, fontSize: 18 }
  const headerTintColor = isWideWeb ? theme.textPrimary : theme.textOnBrand

  return (
    <RequireRepositories>
      <Tabs
        tabBar={isWideWeb ? (props) => <AppSidebar {...props} /> : undefined}
        screenOptions={{
          headerShown: true,
          headerStyle,
          headerTitleStyle,
          headerTintColor,
          tabBarActiveTintColor: theme.brand,
          tabBarInactiveTintColor: theme.textTertiary,
          ...(isWideWeb
            ? { tabBarPosition: I18nManager.isRTL ? 'right' : ('left' as const) }
            : undefined),
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
                  <Ionicons name="person-circle-outline" size={27} color={headerTintColor} />
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
                  <Ionicons name="add" size={28} color={headerTintColor} />
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
                  <Ionicons name="add" size={28} color={headerTintColor} />
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
