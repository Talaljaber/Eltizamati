import { useSyncExternalStore } from 'react'

export const OTP_RESEND_COOLDOWN_MS = 60_000

export type OtpOperation = 'idle' | 'requesting' | 'verifying' | 'resending'

export interface OtpAttemptState {
  readonly normalizedEmail: string
  readonly maskedEmail: string
  readonly requestedAt: number
  readonly resendAvailableAt: number
  readonly operation: OtpOperation
  readonly profile: SignupProfileDetails
}

export interface SignupProfileDetails {
  readonly fullName: string
  readonly phoneNumber: string
  readonly primaryBank: string
}

let state: OtpAttemptState | undefined
let initialOperation: OtpOperation = 'idle'
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function maskPart(value: string): string {
  if (value.length <= 1) return '*'
  return `${value[0]}***${value.length > 2 ? value.at(-1) : ''}`
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  const domainParts = domain.split('.')
  const domainName = domainParts.shift() ?? ''
  const suffix = domainParts.length === 0 ? '' : `.${domainParts.join('.')}`
  return `${maskPart(local)}@${maskPart(domainName)}${suffix}`
}

export function startOtpAttempt(
  normalizedEmail: string,
  profile: SignupProfileDetails,
  now = Date.now(),
): void {
  initialOperation = 'idle'
  state = {
    normalizedEmail,
    maskedEmail: maskEmail(normalizedEmail),
    requestedAt: now,
    resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
    operation: 'idle',
    profile,
  }
  emit()
}

export function clearOtpAttempt(): void {
  state = undefined
  initialOperation = 'idle'
  emit()
}

export function getOtpAttempt(): OtpAttemptState | undefined {
  return state
}

export function beginOtpOperation(operation: Exclude<OtpOperation, 'idle'>): boolean {
  if ((state?.operation ?? initialOperation) !== 'idle') return false
  if (state === undefined) {
    if (operation !== 'requesting') return false
    initialOperation = operation
    return true
  }
  state = { ...state, operation }
  emit()
  return true
}

export function finishOtpOperation(): void {
  if (state === undefined) {
    initialOperation = 'idle'
    return
  }
  if (state.operation === 'idle') return
  state = { ...state, operation: 'idle' }
  emit()
}

export function markOtpResent(now = Date.now()): void {
  if (state === undefined) return
  state = {
    ...state,
    requestedAt: now,
    resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
    operation: 'idle',
  }
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOtpAttempt(): OtpAttemptState | undefined {
  return useSyncExternalStore(subscribe, getOtpAttempt, getOtpAttempt)
}

export function __resetOtpAttemptForTest(): void {
  state = undefined
  initialOperation = 'idle'
  listeners.clear()
}
