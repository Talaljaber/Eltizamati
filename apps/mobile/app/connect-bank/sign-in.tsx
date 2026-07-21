/**
 * SCR-CONNBANK-SIGNIN — mock bank sign-in (connect-plan.md Phase E). Any
 * credentials succeed; nothing entered here is ever persisted, logged, or
 * transmitted anywhere — this screen only ever reads its own local
 * component state, which is discarded on unmount. Face ID is explicitly
 * simulated (no `expo-local-authentication` dependency, matching the
 * existing preview-only convention on `/auth/sign-in`).
 */
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Screen, Text, TextField, space } from '@/core/design-system'
import { useConnectBankFlow, markSignedIn } from '@/features/connect-bank/connect-bank-flow-store'
import { MockDisclosure } from '@/features/connect-bank/components/MockDisclosure'
import { JORDAN_BANKS } from '@/features/auth/data/jordan-banks'

const SIMULATED_SIGN_IN_DELAY_MS = 600

export default function ConnectBankSignInScreen() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const flow = useConnectBankFlow()
  const [accountNumber, setAccountNumber] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState<'password' | 'faceId' | null>(null)
  const signInTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const bank = JORDAN_BANKS.find((candidate) => candidate.id === flow.bankId)

  useEffect(() => {
    if (flow.bankId === undefined) router.replace('/connect-bank')
  }, [flow.bankId, router])

  useEffect(() => {
    // Credentials never outlive this screen — cleared on leave/reset either
    // way, but explicit on unmount too so a fast back-navigation can't leave
    // them sitting in a still-mounted tree for longer than necessary. The
    // pending simulated sign-in timer is also cancelled here — otherwise it
    // could fire after the user has already navigated away, marking a bank
    // "signed in" and redirecting to /select out from under whatever screen
    // they're actually looking at.
    return () => {
      setAccountNumber('')
      setPassword('')
      if (signInTimerRef.current !== undefined) clearTimeout(signInTimerRef.current)
    }
  }, [])

  function proceed(method: 'password' | 'faceId'): void {
    setSigningIn(method)
    signInTimerRef.current = setTimeout(() => {
      markSignedIn()
      router.replace('/connect-bank/select')
    }, SIMULATED_SIGN_IN_DELAY_MS)
  }

  if (bank === undefined) return null

  const isRtl = i18n.language.startsWith('ar')
  const bankName = isRtl ? bank.nameAr : bank.name

  return (
    <Screen maxWidth="readable" gap={4}>
      <Stack.Screen options={{ title: bankName }} />
      <MockDisclosure />
      <Text variant="title">{t('connectBank.signInTitle', { bank: bankName })}</Text>
      <View style={{ gap: space[3] }}>
        <TextField
          label={t('connectBank.accountNumberLabel')}
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder={t('connectBank.accountNumberPlaceholder')}
          testID="connect-bank-account-number"
        />
        <TextField
          label={t('connectBank.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('connectBank.passwordPlaceholder')}
          secureTextEntry
          testID="connect-bank-password"
        />
      </View>
      <Button
        variant="primary"
        label={t('connectBank.signIn')}
        onPress={() => proceed('password')}
        loading={signingIn === 'password'}
        disabled={signingIn !== null}
        testID="connect-bank-sign-in-submit"
      />
      <Button
        variant="secondary"
        label={t('connectBank.useFaceId')}
        onPress={() => proceed('faceId')}
        loading={signingIn === 'faceId'}
        disabled={signingIn !== null}
        testID="connect-bank-face-id"
      />
    </Screen>
  )
}
