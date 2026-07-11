/**
 * Demo repository factory — Phase 5 (ADR-0009, ADR-0017).
 *
 * The ONLY place demo repository instances are created.
 * Each call produces isolated instances — no shared singleton state.
 *
 * PHASE 4 INTEGRATION NOTE:
 *   When Phase 4 completes composition-root.ts integration:
 *   ```ts
 *   import { createDemoRepositories } from './repositories/demo'
 *   // In createCompositionRoot when dataMode === 'demo':
 *   const demoRepos = createDemoRepositories()
 *   return ok({ queryClient, ...demoRepos, authService: undefined })
 *   ```
 *   Do NOT modify composition-root.ts in Phase 5 — leave that untouched.
 *
 * No Supabase imports anywhere in this directory (depcruise enforced).
 */

import { DemoObligationRepository } from './demo-obligation-repository.js'
import { DemoPaymentRepository } from './demo-payment-repository.js'
import { DemoRatePeriodRepository } from './demo-rate-period-repository.js'
import { DemoInsightRepository } from './demo-insight-repository.js'
import { DemoConsentRepository } from './demo-consent-repository.js'
import { DemoUserProfileRepository } from './demo-user-profile-repository.js'
import { DemoCalculationRunRepository } from './demo-calculation-run-repository.js'

export interface DemoRepositories {
  readonly obligationRepository: DemoObligationRepository
  readonly paymentRepository: DemoPaymentRepository
  readonly ratePeriodRepository: DemoRatePeriodRepository
  readonly insightRepository: DemoInsightRepository
  readonly consentRepository: DemoConsentRepository
  readonly userProfileRepository: DemoUserProfileRepository
  readonly calculationRunRepository: DemoCalculationRunRepository
  /** Reset all repositories to empty state. */
  readonly reset: () => void
}

/**
 * Factory — creates a fresh, isolated set of demo repositories.
 * Call `reset()` to wipe all data (FR-SET-005).
 */
export function createDemoRepositories(): DemoRepositories {
  const obligationRepository = new DemoObligationRepository()
  const paymentRepository = new DemoPaymentRepository()
  const ratePeriodRepository = new DemoRatePeriodRepository()
  const insightRepository = new DemoInsightRepository()
  const consentRepository = new DemoConsentRepository()
  const userProfileRepository = new DemoUserProfileRepository()
  const calculationRunRepository = new DemoCalculationRunRepository()

  function reset(): void {
    obligationRepository.reset()
    paymentRepository.reset()
    ratePeriodRepository.reset()
    insightRepository.reset()
    consentRepository.reset()
    userProfileRepository.reset()
    calculationRunRepository.reset()
  }

  return {
    obligationRepository,
    paymentRepository,
    ratePeriodRepository,
    insightRepository,
    consentRepository,
    userProfileRepository,
    calculationRunRepository,
    reset,
  }
}

export { DemoObligationRepository } from './demo-obligation-repository.js'
export { DemoPaymentRepository } from './demo-payment-repository.js'
export { DemoRatePeriodRepository } from './demo-rate-period-repository.js'
export { DemoInsightRepository } from './demo-insight-repository.js'
export { DemoConsentRepository } from './demo-consent-repository.js'
export { DemoUserProfileRepository } from './demo-user-profile-repository.js'
export { DemoCalculationRunRepository } from './demo-calculation-run-repository.js'
