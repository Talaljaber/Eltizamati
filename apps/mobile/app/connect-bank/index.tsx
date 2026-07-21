/**
 * SCR-CONNBANK-PICK — bank picker + entry point for the "pull obligations
 * from your bank" onboarding step (connect-plan.md Phase E). Also the
 * restart point for "any other obligations?" -> Yes, and for a killed app
 * relaunching mid-flow (StartupCoordinator/use-entry-completion both route
 * an incomplete step back here — connect-plan.md Phase D).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { I18nManager, Pressable, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { isErr, type AppError } from '@eltizamati/domain'
import { Button, ErrorState, Screen, Text, space, useTheme } from '@/core/design-system'
import { toErrorUiState } from '@/core/errors/error-ui-state'
import { JORDAN_BANKS } from '@/features/auth/data/jordan-banks'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { selectBank } from '@/features/connect-bank/connect-bank-flow-store'
import { useMarkBankConnectCompleteMutation } from '@/features/connect-bank/api/use-connect-bank'
import { MockDisclosure } from '@/features/connect-bank/components/MockDisclosure'
import { errorMessageKey } from '@/features/connect-bank/error-message-key'

type ConsentStatus = 'checking' | 'required' | 'granted' | 'error'

const BACK_ICON = I18nManager.isRTL ? 'chevron-forward-outline' : 'chevron-back-outline'

export default function ConnectBankPickerScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const theme = useTheme()
  const repos = useRepositories()
  const userId = useActiveUser()
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('checking')
  const [consentError, setConsentError] = useState<AppError | undefined>(undefined)
  const [skipError, setSkipError] = useState<AppError | undefined>(undefined)
  const [attempt, setAttempt] = useState(0)
  const [navigatingBankId, setNavigatingBankId] = useState<string | undefined>(undefined)
  const navigatingRef = useRef(false)
  const markComplete = useMarkBankConnectCompleteMutation()

  const checkConsent = useCallback(async () => {
    if (!userId) return
    setConsentStatus('checking')
    setConsentError(undefined)
    const consents = await repos.consentRepository.status(userId)
    if (isErr(consents)) {
      setConsentError(consents.error)
      setConsentStatus('error')
      return
    }
    const consented = consents.value.some(
      (record) => record.docType === 'provider:mock-open-banking' && record.version === 'v1',
    )
    if (!consented) {
      router.replace({
        pathname: '/connect-mock/consent',
        params: { return: '/connect-bank' },
      })
      return
    }
    setConsentStatus('granted')
  }, [repos, router, userId])

  useEffect(() => {
    let active = true
    async function run() {
      if (!active) return
      await checkConsent()
    }
    void run()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, userId])

  // Pushed screens stay mounted (just unfocused) in a stack navigator, so
  // pressing back from sign-in to here does NOT unmount this screen or rerun
  // its effects — only a focus event fires. Without this, the guard set by
  // handleSelectBank stayed permanently true/set, leaving every bank button
  // stuck in the disabled/loading state forever after a single back-out.
  useFocusEffect(
    useCallback(() => {
      navigatingRef.current = false
      setNavigatingBankId(undefined)
    }, []),
  )

  function handleSelectBank(bankId: string): void {
    // A slow/real (non-demo) backend leaves a visible window between the tap
    // and the screen transition. Without this guard a second tap in that
    // window fires another push, stacking duplicate sign-in screens that
    // look like the picker "reloading" before it finally settles.
    if (navigatingRef.current) return
    navigatingRef.current = true
    setNavigatingBankId(bankId)
    selectBank(bankId)
    router.push('/connect-bank/sign-in')
  }

  async function handleSkip(): Promise<void> {
    if (!userId) return
    setSkipError(undefined)
    try {
      await markComplete.mutateAsync({ userId, repos })
      router.replace('/(tabs)/')
    } catch (cause) {
      setSkipError(cause as AppError)
    }
  }

  // This screen is the ROOT of its own nested Stack (connect-bank/_layout.tsx)
  // — Expo Router never auto-adds a back button for a nested stack's root,
  // even when there's a real screen behind it in the outer stack (e.g.
  // "Add obligation"). `canGoBack()` only reports true in that mid-app entry
  // case: the onboarding-forced entry reaches here via `router.replace`, with
  // nothing behind it, so no back button renders there.
  const headerLeft = router.canGoBack()
    ? () => (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          testID="connect-bank-back"
        >
          <Ionicons name={BACK_ICON} size={24} color={theme.textPrimary} />
        </Pressable>
      )
    : undefined

  if (consentStatus === 'error' && consentError !== undefined) {
    return (
      <Screen maxWidth="readable">
        <Stack.Screen options={{ title: t('connectBank.title'), headerLeft }} />
        <ErrorState
          state={toErrorUiState(consentError)}
          onRetry={() => setAttempt((value) => value + 1)}
          testID="connect-bank-consent-error"
        />
      </Screen>
    )
  }

  if (consentStatus !== 'granted') {
    return (
      <Screen maxWidth="readable">
        <Stack.Screen options={{ title: t('connectBank.title'), headerLeft }} />
      </Screen>
    )
  }

  const isRtl = i18n.language.startsWith('ar')

  return (
    <Screen maxWidth="readable" gap={4}>
      <Stack.Screen options={{ title: t('connectBank.title'), headerLeft }} />
      <Text variant="title">{t('connectBank.pickerTitle')}</Text>
      <Text variant="body" color="secondary">
        {t('connectBank.pickerSubtitle')}
      </Text>
      <MockDisclosure />
      <View style={{ gap: space[2] }}>
        {JORDAN_BANKS.map((bank) => (
          <Button
            key={bank.id}
            variant="secondary"
            label={isRtl ? bank.nameAr : bank.name}
            onPress={() => handleSelectBank(bank.id)}
            loading={navigatingBankId === bank.id}
            disabled={navigatingBankId !== undefined}
            testID={`connect-bank-pick-${bank.id}`}
          />
        ))}
      </View>
      {skipError !== undefined ? (
        <Text variant="bodySmall" color="critical" testID="connect-bank-skip-error">
          {t(errorMessageKey(skipError))}
        </Text>
      ) : null}
      <Button
        variant="ghost"
        label={t('connectBank.skip')}
        onPress={() => {
          void handleSkip()
        }}
        loading={markComplete.isPending}
        disabled={navigatingBankId !== undefined}
        testID="connect-bank-skip"
      />
    </Screen>
  )
}
