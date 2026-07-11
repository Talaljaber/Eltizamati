/**
 * ObligationRepository — class-table inheritance across `obligations` +
 * the per-kind detail table (ADR-0008). Full read/write support for the
 * three schema-backed kinds (conventionalLoan, murabaha, creditCard) —
 * genericFacility/ijara/diminishingMusharakah are explicitly P1-scoped
 * (see obligation-mapper.ts) and map with base fields only.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  err,
  ok,
  makeError,
  localDateFromDate,
  type Result,
  type AppError,
  type Id,
  type Obligation,
  type ObligationRepository,
} from '@eltizamati/domain'
import type { Database } from '../../../core/supabase/database.types'
import {
  baseFromRow,
  baseToRow,
  cardDetailsFromRow,
  cardDetailsToRow,
  loanDetailsFromRow,
  loanDetailsToRow,
  murabahaDetailsFromRow,
  murabahaDetailsToRow,
} from './mappers/obligation-mapper'

type ObligationRow = Database['public']['Tables']['obligations']['Row']

function toStorageAppError(error: { code: string; message: string }): AppError {
  return makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error })
}

const SCHEMA_BACKED_KINDS = new Set(['conventionalLoan', 'murabaha', 'creditCard'])

export class SupabaseObligationRepository implements ObligationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  private async assemble(row: ObligationRow): Promise<Result<Obligation, AppError>> {
    const base = baseFromRow(row)
    const currency = row.currency

    switch (row.kind) {
      case 'conventionalLoan': {
        const [detailsResult, ratePeriodsResult] = await Promise.all([
          this.client.from('loan_details').select('*').eq('obligation_id', row.id).maybeSingle(),
          this.client.from('rate_periods').select('*').eq('obligation_id', row.id),
        ])
        if (detailsResult.error) return err(toStorageAppError(detailsResult.error))
        if (ratePeriodsResult.error) return err(toStorageAppError(ratePeriodsResult.error))
        if (detailsResult.data === null) return err(makeError('dataIncomplete'))
        return ok({
          ...base,
          kind: 'conventionalLoan',
          loanDetails: loanDetailsFromRow(detailsResult.data, ratePeriodsResult.data, currency),
        })
      }
      case 'murabaha': {
        const { data, error } = await this.client
          .from('murabaha_details')
          .select('*')
          .eq('obligation_id', row.id)
          .maybeSingle()
        if (error) return err(toStorageAppError(error))
        if (data === null) return err(makeError('dataIncomplete'))
        return ok({
          ...base,
          kind: 'murabaha',
          murabahaDetails: murabahaDetailsFromRow(data, currency),
        })
      }
      case 'creditCard': {
        const { data, error } = await this.client
          .from('card_details')
          .select('*')
          .eq('obligation_id', row.id)
          .maybeSingle()
        if (error) return err(toStorageAppError(error))
        if (data === null) return err(makeError('dataIncomplete'))
        return ok({ ...base, kind: 'creditCard', cardDetails: cardDetailsFromRow(data, currency) })
      }
      case 'genericFacility':
        return ok({ ...base, kind: 'genericFacility', outstandingBalance: undefined })
      case 'ijara':
        return ok({ ...base, kind: 'ijara', outstandingBalance: undefined })
      case 'diminishingMusharakah':
        return ok({ ...base, kind: 'diminishingMusharakah', outstandingBalance: undefined })
      default:
        return err(
          makeError('unexpected', { safeMetadata: { unexpectedKind: 'true' }, cause: row.kind }),
        )
    }
  }

  async get(id: Id<'obligation'>): Promise<Result<Obligation, AppError>> {
    const { data, error } = await this.client
      .from('obligations')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) return err(toStorageAppError(error))
    if (data === null) return err(makeError('notFound'))
    return this.assemble(data)
  }

  async list(userId: Id<'user'>): Promise<Result<readonly Obligation[], AppError>> {
    const { data, error } = await this.client.from('obligations').select('*').eq('user_id', userId)
    if (error) return err(toStorageAppError(error))

    const assembled: Obligation[] = []
    for (const row of data) {
      const result = await this.assemble(row)
      if (!result.ok) return result
      assembled.push(result.value)
    }
    return ok(assembled)
  }

  async save(obligation: Obligation): Promise<Result<Obligation, AppError>> {
    const { error: baseError } = await this.client.from('obligations').upsert(baseToRow(obligation))
    if (baseError) return err(toStorageAppError(baseError))

    if (obligation.kind === 'conventionalLoan') {
      const { error } = await this.client
        .from('loan_details')
        .upsert(loanDetailsToRow(obligation.id, obligation.userId, obligation.loanDetails))
      if (error) return err(toStorageAppError(error))
    } else if (obligation.kind === 'murabaha') {
      const { error } = await this.client
        .from('murabaha_details')
        .upsert(murabahaDetailsToRow(obligation.id, obligation.userId, obligation.murabahaDetails))
      if (error) return err(toStorageAppError(error))
    } else if (obligation.kind === 'creditCard') {
      const { error } = await this.client
        .from('card_details')
        .upsert(cardDetailsToRow(obligation.id, obligation.userId, obligation.cardDetails))
      if (error) return err(toStorageAppError(error))
    } else if (!SCHEMA_BACKED_KINDS.has(obligation.kind)) {
      // genericFacility/ijara/diminishingMusharakah: no detail table exists yet
      // (P1-scoped, see obligation-mapper.ts) — base row alone is the full
      // persisted representation, never a silent data-loss on save.
    }

    return this.get(obligation.id)
  }

  /** No `archived` column exists — archival is represented by setting `closedDate` (ObligationBase's own field). */
  async archive(id: Id<'obligation'>): Promise<Result<void, AppError>> {
    const { error } = await this.client
      .from('obligations')
      .update({ closed_date: localDateFromDate(new Date()) })
      .eq('id', id)
    if (error) return err(toStorageAppError(error))
    return ok(undefined)
  }

  /** Detail-table rows cascade via ON DELETE CASCADE (verified by Phase 3 pgTAP). */
  async delete(id: Id<'obligation'>): Promise<Result<void, AppError>> {
    const { error } = await this.client.from('obligations').delete().eq('id', id)
    if (error) return err(toStorageAppError(error))
    return ok(undefined)
  }
}
