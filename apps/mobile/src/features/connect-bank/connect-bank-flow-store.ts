/**
 * In-memory flow state shared across the `/connect-bank` screens — mirrors
 * `features/auth/stores/otp-attempt-store.ts`'s module-store pattern for
 * passing data between routes without serializing it through navigation
 * params (the retrieved records carry Money/Rate value objects).
 *
 * Deliberately NOT persisted to AsyncStorage: the process-death policy for
 * this flow is "restart at bank selection" (connect-plan.md Phase D) — a
 * killed app naturally re-enters at `/connect-bank` via
 * `preparePersonalEntry`'s `bankConnectRequired` decision, so there is
 * nothing to resume mid-flow. Credentials are never stored here at all, not
 * even transiently — the mock sign-in screen only ever reads its local
 * component state.
 */
import { useSyncExternalStore } from 'react'
import type { RawProviderRecord } from '@eltizamati/demo-data'

export interface ConnectBankFlowState {
  readonly bankId?: string
  readonly signedIn: boolean
  readonly records: readonly RawProviderRecord[]
  readonly selectedExternalIds: ReadonlySet<string>
}

const initialState: ConnectBankFlowState = {
  bankId: undefined,
  signedIn: false,
  records: [],
  selectedExternalIds: new Set(),
}

let state: ConnectBankFlowState = initialState
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getConnectBankFlow(): ConnectBankFlowState {
  return state
}

export function useConnectBankFlow(): ConnectBankFlowState {
  return useSyncExternalStore(subscribe, getConnectBankFlow, getConnectBankFlow)
}

export function selectBank(bankId: string): void {
  state = { bankId, signedIn: false, records: [], selectedExternalIds: new Set() }
  emit()
}

export function markSignedIn(): void {
  if (state.bankId === undefined) return
  state = { ...state, signedIn: true }
  emit()
}

export function setRetrievedRecords(records: readonly RawProviderRecord[]): void {
  state = { ...state, records, selectedExternalIds: new Set() }
  emit()
}

export function toggleSelected(externalId: string): void {
  const next = new Set(state.selectedExternalIds)
  if (next.has(externalId)) next.delete(externalId)
  else next.add(externalId)
  state = { ...state, selectedExternalIds: next }
  emit()
}

/** Called on "any other obligations?" -> Yes, to restart at bank selection. */
export function resetConnectBankFlow(): void {
  state = initialState
  emit()
}

export function __resetConnectBankFlowForTest(): void {
  state = initialState
  listeners.clear()
}
