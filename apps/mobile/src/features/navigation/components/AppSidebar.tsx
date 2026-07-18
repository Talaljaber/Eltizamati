import { Image, Pressable, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Text,
  useTheme,
  space,
  radius,
  layout,
  minTouchTarget,
  type WebPressableState,
} from '@/core/design-system'
import appIcon from '../../../../assets/icon.png'

/**
 * Custom bottom-tabs `tabBar` renderer used only when `isWideWeb`
 * (`app/(tabs)/_layout.tsx` sets `tabBarPosition` + this component together).
 * Renders the same 4 tabs as the mobile bottom bar, plus Settings/Profile,
 * as a persistent left/right side panel — the primary nav for a real web
 * layout. Native and narrow web never mount this component.
 */
export function AppSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.root, { width: layout.sidebarWidth, borderColor: theme.border }]}
      testID="app-sidebar"
    >
      <View style={styles.brandRow}>
        <View style={[styles.brandMark, { backgroundColor: theme.brand }]}>
          <Image source={appIcon} style={styles.brandMarkImage} accessibilityIgnoresInvertColors />
        </View>
        <Text variant="heading">{t('common.appName', 'Eltizamati')}</Text>
      </View>

      <View style={styles.primaryNav} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const label = options.title ?? route.name
          const focused = state.index === index
          const icon = options.tabBarIcon?.({
            focused,
            color: focused ? theme.brand : theme.textSecondary,
            size: 20,
          })

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                if (!focused) navigation.navigate(route.name)
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              testID={`app-sidebar-${route.name}`}
              style={({ pressed, hovered }: WebPressableState) => [
                styles.navRow,
                focused ? { backgroundColor: theme.brandSoft } : undefined,
                !focused && (pressed || hovered === true)
                  ? { backgroundColor: theme.bgSubtle }
                  : undefined,
              ]}
            >
              {icon}
              <Text variant="body" color={focused ? 'brand' : 'primary'}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.spacer} />

      <View style={styles.secondaryNav}>
        <SidebarSecondaryRow
          icon="settings-outline"
          label={t('navigation.settings')}
          onPress={() => router.push('/settings/')}
        />
        <SidebarSecondaryRow
          icon="person-circle-outline"
          label={t('profile.title')}
          onPress={() => router.push('/profile')}
        />
      </View>
    </SafeAreaView>
  )
}

function SidebarSecondaryRow({
  icon,
  label,
  onPress,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap
  readonly label: string
  readonly onPress: () => void
}) {
  const theme = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, hovered }: WebPressableState) => [
        styles.navRow,
        pressed || hovered === true ? { backgroundColor: theme.bgSubtle } : undefined,
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <Text variant="body" color="secondary">
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingVertical: space[5],
    paddingHorizontal: space[3],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[2],
    marginBottom: space[6],
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandMarkImage: {
    width: '100%',
    height: '100%',
  },
  primaryNav: {
    gap: space[1],
  },
  spacer: {
    flex: 1,
  },
  secondaryNav: {
    gap: space[1],
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: minTouchTarget,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
  },
})
