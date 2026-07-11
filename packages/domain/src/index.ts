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
export type {} from './value-objects/money.js'
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

// ─── Entities ─────────────────────────────────────────────────────────────────
export type {
  ObligationKind,
  ObligationBase,
  ObligationStatus,
  RateType,
  LoanPurpose,
  ConventionalLoanDetails,
  ConventionalLoan,
  MurabahaDetails,
  MurabahaFinancing,
  CardDetails,
  MinPaymentRule,
  CreditCard,
  GenericFacility,
  IjaraFinancing,
  DiminishingMusharakahFinancing,
  Obligation,
} from './entities/obligation.js'
export { isConventionalLoan, isMurabaha, isCreditCard } from './entities/obligation.js'

// ─── Services ────────────────────────────────────────────────────────────────
export { deriveObligationStatus } from './services/derive-obligation-status.js'
export type { StatusDerivationInputs } from './services/derive-obligation-status.js'

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
