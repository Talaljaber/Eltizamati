/**
 * Repository port contracts — the seam both demo (in-memory) and Supabase
 * repository implementations satisfy (system-architecture.md §6, ADR-0017).
 *
 * These are application ports, not domain entities — they describe *how*
 * persisted data is read/written, not *what* it means. They are co-located in
 * `packages/domain` deliberately (see PHASE-02-DECISION-LOG.md §5): every
 * type referenced here is a domain entity/VO or `Result<T, AppError>` — zero
 * Supabase/Postgres/React/React-Native imports, verified against
 * `.dependency-cruiser.cjs`'s domain-purity rules. Implementations (which do
 * import Supabase/SQLite-adjacent machinery) live outside this package.
 *
 * Every method returns `Result<T, AppError>` (wrapped in a `Promise` — even
 * the in-memory demo implementation is async, so callers never special-case
 * demo vs. personal mode).
 */
import type { Result, AppError } from '../errors/app-error.js'
import type { Id } from '../value-objects/id.js'
import type { Obligation } from '../entities/obligation.js'
import type { Payment } from '../entities/payment.js'
import type { RatePeriod } from '../entities/rate-period.js'
import type { CalculationRun } from '../entities/calculation-run.js'
import type { Insight } from '../entities/insight.js'
import type { ConsentRecord } from '../entities/consent-record.js'
import type { UserProfile } from '../entities/user-profile.js'

export interface ObligationRepository {
  list(userId: Id<'user'>): Promise<Result<readonly Obligation[], AppError>>
  get(id: Id<'obligation'>): Promise<Result<Obligation, AppError>>
  save(obligation: Obligation): Promise<Result<Obligation, AppError>>
  archive(id: Id<'obligation'>): Promise<Result<void, AppError>>
  delete(id: Id<'obligation'>): Promise<Result<void, AppError>>
}

export interface PaymentRepository {
  listFor(obligationId: Id<'obligation'>): Promise<Result<readonly Payment[], AppError>>
  log(payment: Payment): Promise<Result<Payment, AppError>>
}

export interface RatePeriodRepository {
  historyFor(obligationId: Id<'obligation'>): Promise<Result<readonly RatePeriod[], AppError>>
  /** Append-only (BR-RATE-001) — implementations must never mutate an existing row. */
  append(period: RatePeriod): Promise<Result<RatePeriod, AppError>>
}

export interface CalculationRunRepository {
  latestFor(
    obligationId: Id<'obligation'> | undefined,
    formulaId: string,
  ): Promise<Result<CalculationRun | undefined, AppError>>
  persist(run: CalculationRun): Promise<Result<CalculationRun, AppError>>
}

export interface InsightRepository {
  list(userId: Id<'user'>): Promise<Result<readonly Insight[], AppError>>
  markRead(id: Id<'insight'>): Promise<Result<void, AppError>>
  raise(insight: Insight): Promise<Result<Insight, AppError>>
}

export interface ConsentRepository {
  status(userId: Id<'user'>): Promise<Result<readonly ConsentRecord[], AppError>>
  acknowledge(record: ConsentRecord): Promise<Result<ConsentRecord, AppError>>
}

export interface UserProfileRepository {
  get(userId: Id<'user'>): Promise<Result<UserProfile, AppError>>
  /** Inserts only when absent and returns the existing row on a uniqueness race. */
  createIfAbsent(profile: UserProfile): Promise<Result<UserProfile, AppError>>
  save(profile: UserProfile): Promise<Result<UserProfile, AppError>>
}
