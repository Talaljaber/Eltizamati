/**
 * SCR-ONB-WELCOME — branded splash / landing screen (step 0 of 4).
 *
 * The very first screen a new install shows: logo, tagline, and the two
 * real entry points — start the (demo-first) onboarding flow, or go
 * straight to sign-in for an existing account. No network, no storage
 * writes here.
 */

import { View, StyleSheet, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Button, space, useTheme, radius } from '@/core/design-system'
import appIcon from '../../assets/icon.png'

export default function WelcomeScreen() {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.brand }]}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={styles.logoFrame}>
            <Image source={appIcon} style={styles.logo} accessibilityIgnoresInvertColors />
          </View>
          <Text variant="title" color="onBrand" align="center">
            {t('common.appName', 'Eltizamati')}
          </Text>
          <Text variant="body" color="onBrand" align="center">
            {t('onboarding.welcomeTagline')}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            variant="secondary"
            label={t('onboarding.welcomeGetStarted')}
            onPress={() => router.push('/onboarding/language')}
            testID="welcome-get-started"
          />
          <View style={styles.signInRow}>
            <Text variant="bodySmall" color="onBrand">
              {t('onboarding.welcomeHaveAccount')}
            </Text>
            <Text
              variant="bodySmall"
              color="onBrand"
              onPress={() => router.push('/auth/sign-in')}
              testID="welcome-sign-in"
            >
              {t('onboarding.welcomeSignIn')}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: space[6],
    paddingVertical: space[8],
    justifyContent: 'space-between',
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
  },
  logoFrame: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: space[3],
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  actions: {
    gap: space[4],
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space[1],
  },
})
