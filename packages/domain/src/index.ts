/**
 * packages/domain — public API surface.
 *
 * Only export what downstream consumers (apps/mobile, packages/demo-data,
 * packages/finance-engine) need. Keep internal helpers package-private.
 *
 * AI_AGENT_RULES §2: search this index before creating a new abstraction.
 */

// ─── Value objects ────────────────────────────────────────────────────────────
export { Money, Rate } from './value-objects/money.js'
export { brandId, toLocalDate, localDateFromDate } from './value-objects/id.js'
export type { Id, LocalDate } from './value-objects/id.js'
export {
  userEntered,
  demoSourced,
  engineEstimate,
  isHigherPriority,
  isStale,
} from './value-objects/provenance.js'
export type { Provenance, Sourced, SourceClass } from './value-objects/provenance.js'
export { Percentage } from './value-objects/percentage.js'
export type { Confidence } from './value-objects/confidence.js'
export {
  confidenceRank,
  weakestConfidence,
  isAtLeastConfidence,
} from './value-objects/confidence.js'
export type { CardFee, CardFeeType } from './value-objects/fee.js'
export {
  compareLocalDate,
  isBeforeLocalDate,
  isAfterLocalDate,
  isAtOrBeforeLocalDate,
  addMonthsToLocalDate,
  addDaysToLocalDate,
  daysBetweenLocalDates,
} from './value-objects/local-date-math.js'

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  conv5PerPeriodTolerance,
  conv5PerScheduleTolerance,
  CONV_6_OVERDUE_GRACE_DAYS,
  CONV_7_DUE_SOON_HORIZON_DAYS,
  BR_STAT_003_DELINQUENCY_THRESHOLD_PERIODS,
  CALCULATION_REFUSED_INSIGHT_RULE_ID,
} from './constants.js'

// ─── Entities ─────────────────────────────────────────────────────────────────
export type {
  ObligationKind,
  Institution,
  ObligationBase,
  ObligationStatus,
  RateType,
  LoanPurpose,
  ConventionalLoanDetails,
  ConventionalLoan,
  MurabahaDetails,
  MurabahaFinancing,
  CardDetails,
  MinimumPaymentRule,
  CreditCard,
  GenericFacility,
  IjaraFinancing,
  DiminishingMusharakahFinancing,
  Obligation,
} from './entities/obligation.js'
export { isConventionalLoan, isMurabaha, isCreditCard } from './entities/obligation.js'
export type { RatePeriod } from './entities/rate-period.js'
export type { Payment, PaymentAllocation } from './entities/payment.js'
export type { Insight, InsightSeverity } from './entities/insight.js'
export type { ConsentRecord } from './entities/consent-record.js'
export type { DataMode, UserProfile } from './entities/user-profile.js'
export type {
  CalculationOutcome,
  CalculationOutcomeResult,
  CalculationOutcomeRefused,
  CalculationRun,
} from './entities/calculation-run.js'

// ─── Services ────────────────────────────────────────────────────────────────
export { deriveObligationStatus } from './services/derive-obligation-status.js'
export type { StatusDerivationInputs } from './services/derive-obligation-status.js'
export { validateRatePeriods } from './services/validate-rate-periods.js'
export { validateMurabahaFinancing } from './services/validate-murabaha.js'
export { validatePaymentAllocation } from './services/validate-payment-allocation.js'
export { resolveMinimumPaymentDue } from './services/resolve-minimum-payment.js'
export type { MinimumPaymentResolution } from './services/resolve-minimum-payment.js'
export {
  canonicalStringify,
  hashCanonicalJson,
  sha256Hex,
  toCanonicalJsonValue,
} from './services/canonical-json.js'
export type { CanonicalJsonValue } from './services/canonical-json.js'

// ─── Contracts (repository ports) ────────────────────────────────────────────
export type {
  ObligationRepository,
  PaymentRepository,
  RatePeriodRepository,
  CalculationRunRepository,
  InsightRepository,
  ConsentRepository,
  UserProfileRepository,
} from './contracts/repositories.js'

// ─── Errors & Result ─────────────────────────────────────────────────────────
export {
  makeError,
  ok,
  err,
  isOk,
  isErr,
  mapResult,
  DomainInvariantError,
} from './errors/app-error.js'
export type { AppErrorCode, AppError, ErrorSeverity, Result, Ok, Err } from './errors/app-error.js'
