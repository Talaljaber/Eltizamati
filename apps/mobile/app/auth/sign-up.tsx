import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ErrorState, Text, space, useTheme } from '@/core/design-system'
import { useSignUpMutation } from '@/features/auth/api/use-auth-mutations'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { DismissKeyboardView } from '@/features/auth/components/DismissKeyboardView'
import { PickerSheetField } from '@/features/auth/components/PickerSheetField'
import { COUNTRY_CODES, type CountryCode } from '@/features/auth/data/country-codes'
import { JORDAN_BANKS, type JordanBank } from '@/features/auth/data/jordan-banks'
import { useAuthService } from '@/features/auth/hooks/use-auth-service'
import { normalizeSignupProfile } from '@/features/auth/services/signup-profile'
import {
  beginOtpOperation,
  finishOtpOperation,
  startOtpAttempt,
} from '@/features/auth/stores/otp-attempt-store'
import { normalizeAuthEmail } from '@/services/auth/auth-email'

const DEFAULT_COUNTRY_ID = 'jo'

export default function SignUpScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const signUp = useSignUpMutation(useAuthService())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [countryId, setCountryId] = useState(DEFAULT_COUNTRY_ID)
  const [localNumber, setLocalNumber] = useState('')
  const [bankId, setBankId] = useState<string | undefined>(undefined)
  const [validationError, setValidationError] = useState<string>()

  const selectedCountry = COUNTRY_CODES.find((c) => c.id === countryId)
  const selectedBank = JORDAN_BANKS.find((b) => b.id === bankId)

  async function submit(): Promise<void> {
    const normalizedEmail = normalizeAuthEmail(email)
    const phoneNumber = `${selectedCountry?.dialCode ?? ''}${localNumber.replace(/\D/g, '')}`
    const profile = normalizeSignupProfile({
      fullName,
      phoneNumber,
      primaryBank: selectedBank?.name ?? '',
    })
    const errorKey =
      normalizedEmail === undefined
        ? 'auth.invalidEmail'
        : password.length < 12
          ? 'auth.passwordRequirements'
          : password !== confirmPassword
            ? 'auth.passwordMismatch'
            : profile === undefined
              ? 'auth.profileValidation'
              : undefined
    setValidationError(errorKey)
    if (errorKey !== undefined || normalizedEmail === undefined || profile === undefined) return
    if (!beginOtpOperation('requesting')) return
    try {
      await signUp.mutateAsync({ email: normalizedEmail, password })
      startOtpAttempt(normalizedEmail, profile)
      router.push('/auth/verify-code')
    } catch {
      // The typed mutation error remains visible below.
    } finally {
      finishOtpOperation()
    }
  }

  const error = signUp.error ?? undefined
  const offline = error?.code === 'connectivity'
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {offline ? (
        <ErrorState state={{ kind: 'offline' }} onRetry={() => void submit()} />
      ) : (
        <DismissKeyboardView style={styles.content}>
          <Text variant="title" align="center">
            {t('auth.signUpTitle')}
          </Text>
          <View style={styles.form}>
            <AuthTextField
              label={t('auth.fullName')}
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
              testID="sign-up-full-name"
            />
            <View style={styles.phoneRow}>
              <PickerSheetField<CountryCode>
                label={t('auth.countryCode')}
                items={COUNTRY_CODES}
                getId={(c) => c.id}
                getLabel={(c) => `${c.flag} ${c.name} (${c.dialCode})`}
                getSearchText={(c) => `${c.name} ${c.dialCode}`}
                selectedId={countryId}
                onSelect={(c) => setCountryId(c.id)}
                placeholder={t('auth.countryCode')}
                searchPlaceholder={t('auth.searchCountry')}
                renderTriggerValue={(c) => `${c.flag} ${c.dialCode}`}
                compact
                testID="sign-up-country-code"
              />
              <AuthTextField
                label={t('auth.phoneNumber')}
                value={localNumber}
                onChangeText={setLocalNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                style={styles.phoneInput}
                testID="sign-up-phone"
              />
            </View>
            <PickerSheetField<JordanBank>
              label={t('auth.primaryBank')}
              items={JORDAN_BANKS}
              getId={(b) => b.id}
              getLabel={(b) => b.name}
              selectedId={bankId}
              onSelect={(b) => setBankId(b.id)}
              placeholder={t('auth.selectBank')}
              searchPlaceholder={t('auth.searchBank')}
              testID="sign-up-bank"
            />
            <AuthTextField
              label={t('auth.emailLabel')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              testID="sign-up-email"
            />
            <AuthTextField
              label={t('auth.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              testID="sign-up-password"
            />
            <AuthTextField
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              testID="sign-up-confirm-password"
            />
            {validationError !== undefined ? (
              <Text variant="bodySmall" color="critical" testID="sign-up-validation-error">
                {t(validationError)}
              </Text>
            ) : null}
            {error !== undefined && !offline ? (
              <Text variant="bodySmall" color="critical" testID="sign-up-error">
                {t(error.code === 'rateLimited' ? 'auth.emailRateLimited' : 'auth.signUpFailed')}
              </Text>
            ) : null}
            <Button
              variant="primary"
              label={t('auth.createAccount')}
              loading={signUp.isPending}
              disabled={signUp.isPending}
              onPress={() => void submit()}
              testID="sign-up-submit"
            />
            <Button
              variant="ghost"
              label={t('auth.backToSignIn')}
              onPress={() => router.back()}
            />
          </View>
        </DismissKeyboardView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: space[5], padding: space[6] },
  form: { gap: space[3] },
  phoneRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-end' },
  phoneInput: { flex: 1 },
})
