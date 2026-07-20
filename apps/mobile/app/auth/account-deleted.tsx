import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Button,
  Card,
  Text,
  space,
  layout,
  useTheme,
  useResponsiveLayout,
} from '@/core/design-system'

/**
 * Landing point right after a successful account deletion (settings.tsx's
 * delete flow routes here via use-auth-exit-coordinator.ts) — a deliberate
 * stop between "account gone" and the sign-in screen, rather than dropping
 * the user straight into the demo-mode language picker as if nothing had
 * just happened.
 */
export default function AccountDeletedScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const { isWideWeb } = useResponsiveLayout()

  const content = (
    <View style={styles.content}>
      <Text variant="title" align="center">
        {t('auth.accountDeletedTitle')}
      </Text>
      <Text variant="body" color="secondary" align="center">
        {t('auth.accountDeletedBody')}
      </Text>
      <Button
        variant="primary"
        label={t('auth.accountDeletedContinue')}
        onPress={() => router.replace('/auth/sign-in')}
        testID="account-deleted-continue"
      />
    </View>
  )

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {isWideWeb ? (
        <View style={styles.wideOuter}>
          <View style={styles.authCard}>
            <Card>
              <View style={styles.wideCardInner}>{content}</View>
            </Card>
          </View>
        </View>
      ) : (
        <View style={styles.outer}>{content}</View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  outer: { flex: 1, justifyContent: 'center', padding: space[6] },
  wideOuter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6] },
  authCard: { width: '100%', maxWidth: layout.authMaxWidth },
  wideCardInner: { gap: space[5] },
  content: { gap: space[5] },
})
