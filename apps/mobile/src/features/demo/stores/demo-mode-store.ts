/**
 * Demo-mode store — Phase 5 (system-architecture.md §4).
 *
 * Uses a simple module-level store backed by AsyncStorage since Zustand is
 * not yet installed in the app package. The store interface matches the Zustand
 * pattern so migration is a drop-in replace when Zustand is added.
 *
 * NO financial data stored here (AI_AGENT_RULES §6).
 * Keys: '@Eltizamati:dataMode', '@Eltizamati:onboardingComplete'
 *
 * ASSUMPTION: Zustand is listed as the target state solution in ADR-0004 but is
 * not yet in apps/mobile/package.json. This implementation achieves the same
 * semantics using React's built-in primitives. Migration to Zustand is a
 * 1-file change once the package is approved (AI_AGENT_RULES §12).
 *
 * PHASE 4 INTEGRATION NOTE:
 *   Phase 4 composition-root.ts reads `dataMode` to select the repository family.
 *   Integration step: import `getDataMode()` from this module and pass it to
 *   `createCompositionRoot`. Do NOT modify composition-root.ts in Phase 5.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { err, makeError, ok, type AppError, type DataMode, type Result } from '@eltizamati/domain'

const DATA_MODE_KEY = '@Eltizamati:dataMode'
const ONBOARDING_KEY = '@Eltizamati:onboardingComplete'

// ─── Persistent read/write helpers ───────────────────────────────────────────

export async function getDataMode(): Promise<DataMode | null> {
  const raw = await AsyncStorage.getItem(DATA_MODE_KEY).catch(() => null)
  if (raw === 'demo' || raw === 'personal') return raw as DataMode
  return null
}

export async function setDataMode(mode: DataMode): Promise<void> {
  await AsyncStorage.setItem(DATA_MODE_KEY, mode)
}

export async function getOnboardingComplete(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null)
  return raw === 'true'
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
}

export interface StartupTrustState {
  readonly dataMode: DataMode | null
  readonly onboardingComplete: boolean
}

/** Startup uses a strict read so storage failure becomes a retryable UI state. */
export async function readStartupTrustState(): Promise<Result<StartupTrustState, AppError>> {
  try {
    const entries = await AsyncStorage.multiGet([DATA_MODE_KEY, ONBOARDING_KEY])
    const rawMode = entries[0]?.[1]
    return ok({
      dataMode: rawMode === 'demo' || rawMode === 'personal' ? rawMode : null,
      onboardingComplete: entries[1]?.[1] === 'true',
    })
  } catch (cause) {
    return err(
      makeError('storage', {
        safeMetadata: { operation: 'startup_trust_state' },
        cause,
      }),
    )
  }
}

export async function clearDataMode(): Promise<void> {
  await Promise.all([AsyncStorage.removeItem(DATA_MODE_KEY), AsyncStorage.removeItem(ONBOARDING_KEY)])
}

/** Clears only the selected repository family, preserving language. */
export async function clearDataModeSelection(): Promise<void> {
  await AsyncStorage.removeItem(DATA_MODE_KEY)
}

/** Clears the completed-onboarding trust marker, preserving language. */
export async function clearOnboardingTrust(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY)
}
