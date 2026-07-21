/**
 * Demo Data package — Phase 5 public API.
 *
 * Exports: DEMO_DATE anchor, DEMO_SEED_VERSION, all builders, DemoSeed type,
 * fixture vocabulary, and DEMO_IDS for test assertions.
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export { DEMO_DATE, DEMO_SEED_VERSION } from './constants.js'

// ─── Builders ─────────────────────────────────────────────────────────────────
export {
  DEMO_IDS,
  buildDemoLoan,
  buildDemoMurabaha,
  buildDemoCard,
  buildDemoLoanPayments,
  buildDemoMurabahaPayments,
  buildDemoLoanRatePeriods,
  buildDemoInsights,
  buildDemoSeed,
} from './builders.js'

export type { DemoSeed } from './builders.js'

// ─── Fixtures (test vocabulary) ───────────────────────────────────────────────
export { aLoan, aMurabaha, aCard, aPayment, aRatePeriod, anInsight } from './fixtures.js'

// ─── Bank-connect provider catalog ─────────────────────────────────────────────
export { buildBankCatalog } from './bank-catalog.js'
export type {
  RawProviderRecord,
  RawCreditCardRecord,
  RawConventionalLoanRecord,
  RawMurabahaRecord,
} from './bank-catalog.js'
