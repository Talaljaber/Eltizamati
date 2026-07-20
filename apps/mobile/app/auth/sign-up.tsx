import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Button,
  Card,
  ErrorState,
  Text,
  space,
  minTouchTarget,
  layout,
  useTheme,
  useResponsiveLayout,
  PickerSheetField,
} from '@/core/design-system'
import { acknowledgeLocalConsent } from '@/features/consent/consent-policy'
import { useSignUpMutation } from '@/features/auth/api/use-auth-mutations'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { DismissKeyboardView } from '@/features/auth/components/DismissKeyboardView'
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
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const router = useRouter()
  const { isWideWeb } = useResponsiveLayout()
  const signUp = useSignUpMutation(useAuthService())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [countryId, setCountryId] = useState(DEFAULT_COUNTRY_ID)
  const [localNumber, setLocalNumber] = useState('')
  const [bankId, setBankId] = useState<string | undefined>(undefined)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [hasViewedTerms, setHasViewedTerms] = useState(false)
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
              : !agreedToTerms
                ? 'auth.mustAgreeToTerms'
                : undefined
    setValidationError(errorKey)
    if (
      errorKey !== undefined ||
      normalizedEmail === undefined ||
      profile === undefined ||
      !agreedToTerms
    )
      return
    if (!beginOtpOperation('requesting')) return
    try {
      await signUp.mutateAsync({ email: normalizedEmail, password })
      // Record the agreement now (locally) so the post-verification entry flow
      // writes the account-scoped consent record and never re-prompts on a
      // separate consent screen. The affirmative act happened here, at sign-up.
      await acknowledgeLocalConsent(i18n.language.startsWith('ar') ? 'ar' : 'en')
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

  const formContent = (
    <>
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
            getSearchText={(c) => `${c.name} ${c.nameAr} ${c.dialCode}`}
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
          getSearchText={(b) => `${b.name} ${b.nameAr}`}
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
          autoComplete="password"
          textContentType="password"
          testID="sign-up-confirm-password"
        />
        <View style={styles.termsSection}>
          <Button
            variant="ghost"
            label={t('auth.agreeToTermsLink')}
            onPress={() => {
              setHasViewedTerms(true)
              router.push('/legal-doc')
            }}
            testID="sign-up-terms-link"
          />
          <Pressable
            onPress={() => hasViewedTerms && setAgreedToTerms((v) => !v)}
            style={[styles.termsRow, !hasViewedTerms && styles.termsRowDisabled]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms, disabled: !hasViewedTerms }}
            accessibilityLabel={t('auth.agreeToTerms')}
            testID="sign-up-terms-checkbox"
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: agreedToTerms ? theme.brand : theme.border,
                  backgroundColor: agreedToTerms ? theme.brand : 'transparent',
                },
              ]}
            >
              {agreedToTerms ? (
                <Text variant="caption" color="onBrand" align="center">
                  {'✓'}
                </Text>
              ) : null}
            </View>
            <View style={styles.termsLabel}>
              <Text variant="bodySmall" color="secondary">
                {t('auth.agreeToTerms')}
              </Text>
            </View>
          </Pressable>
          {!hasViewedTerms ? (
            <Text variant="caption" color="secondary" testID="sign-up-read-terms-hint">
              {t('auth.readTermsFirst')}
            </Text>
          ) : null}
        </View>
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
          disabled={signUp.isPending || !agreedToTerms}
          onPress={() => void submit()}
          testID="sign-up-submit"
        />
        <Button variant="ghost" label={t('auth.backToSignIn')} onPress={() => router.back()} />
      </View>
    </>
  )

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {offline ? (
        <ErrorState state={{ kind: 'offline' }} onRetry={() => void submit()} />
      ) : isWideWeb ? (
        <DismissKeyboardView style={styles.wideOuter}>
          <View style={styles.authCard}>
            <Card>
              <View style={styles.wideCardInner}>{formContent}</View>
            </Card>
          </View>
        </DismissKeyboardView>
      ) : (
        <DismissKeyboardView style={styles.content}>{formContent}</DismissKeyboardView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: space[5], padding: space[6] },
  wideOuter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6] },
  authCard: { width: '100%', maxWidth: layout.authMaxWidth },
  wideCardInner: { gap: space[5] },
  form: { gap: space[3] },
  phoneRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-end' },
  phoneInput: { flex: 1 },
  termsSection: { gap: space[1] },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    minHeight: minTouchTarget,
  },
  termsRowDisabled: { opacity: 0.5 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  termsLabel: { flex: 1 },
})
