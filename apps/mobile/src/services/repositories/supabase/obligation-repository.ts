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
import { toSupabaseAppError } from '../../../core/supabase/supabase-error'
import { decryptField, encryptField } from '../../../core/crypto/field-cipher'

type ObligationRow = Database['public']['Tables']['obligations']['Row']

const SCHEMA_BACKED_KINDS = new Set(['conventionalLoan', 'murabaha', 'creditCard'])

export class SupabaseObligationRepository implements ObligationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * Decrypts the two client-encrypted free-text fields (nickname, notes) on a freshly mapped
   * base row. `institution.name` stays plaintext (see the encryption plan — needed server-side
   * by the rate-campaign RPCs), as does every other base field.
   */
  private async decryptBase(
    base: ReturnType<typeof baseFromRow>,
  ): Promise<Result<ReturnType<typeof baseFromRow>, AppError>> {
    const nicknameResult = await decryptField(this.client, base.nickname)
    if (!nicknameResult.ok) return nicknameResult
    const notesResult =
      base.notes === undefined ? ok(undefined) : await decryptField(this.client, base.notes)
    if (!notesResult.ok) return notesResult
    return ok({ ...base, nickname: nicknameResult.value, notes: notesResult.value })
  }

  private async assemble(row: ObligationRow): Promise<Result<Obligation, AppError>> {
    const decryptedBase = await this.decryptBase(baseFromRow(row))
    if (!decryptedBase.ok) return decryptedBase
    const base = decryptedBase.value
    const currency = row.currency

    switch (row.kind) {
      case 'conventionalLoan': {
        const [detailsResult, ratePeriodsResult] = await Promise.all([
          this.client.from('loan_details').select('*').eq('obligation_id', row.id).maybeSingle(),
          this.client.from('rate_periods').select('*').eq('obligation_id', row.id),
        ])
        if (detailsResult.error) return err(toSupabaseAppError(detailsResult.error))
        if (ratePeriodsResult.error) return err(toSupabaseAppError(ratePeriodsResult.error))
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
        if (error) return err(toSupabaseAppError(error))
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
        if (error) return err(toSupabaseAppError(error))
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
    if (error) return err(toSupabaseAppError(error))
    if (data === null) return err(makeError('notFound'))
    return this.assemble(data)
  }

  async list(userId: Id<'user'>): Promise<Result<readonly Obligation[], AppError>> {
    const { data, error } = await this.client.from('obligations').select('*').eq('user_id', userId)
    if (error) return err(toSupabaseAppError(error))

    const assembled: Obligation[] = []
    for (const row of data) {
      const result = await this.assemble(row)
      if (!result.ok) return result
      assembled.push(result.value)
    }
    return ok(assembled)
  }

  /**
   * Base row + subtype detail row commit or roll back together (F-07): each
   * schema-backed kind has its own `save_*` RPC, and a single PL/pgSQL function
   * call is one Postgres transaction — a detail-write failure inside it rolls
   * back the base-row write too, instead of leaving a `dataIncomplete` ghost
   * obligation the previous two-network-call `.upsert()` sequence could produce.
   */
  async save(obligation: Obligation): Promise<Result<Obligation, AppError>> {
    // Encrypted once up front so every write path below (three save_* RPCs, plus the generic
    // direct-table upsert) substitutes the same ciphertext rather than re-encrypting per path.
    const encryptedNicknameResult = await encryptField(this.client, obligation.nickname)
    if (!encryptedNicknameResult.ok) return encryptedNicknameResult
    const encryptedNotesResult =
      obligation.notes === undefined
        ? ok(undefined)
        : await encryptField(this.client, obligation.notes)
    if (!encryptedNotesResult.ok) return encryptedNotesResult
    const encryptedNickname = encryptedNicknameResult.value
    const encryptedNotes = encryptedNotesResult.value

    if (obligation.kind === 'conventionalLoan') {
      const details = loanDetailsToRow(obligation.id, obligation.userId, obligation.loanDetails)
      const { error } = await this.client.rpc('save_conventional_loan', {
        p_id: obligation.id,
        p_connection_type: obligation.connectionType,
        p_nickname: encryptedNickname,
        p_institution_name: obligation.institution.name,
        p_institution_id: obligation.institution.id ?? null,
        p_opened_date: obligation.openedDate,
        p_closed_date: obligation.closedDate ?? null,
        p_notes: encryptedNotes ?? null,
        p_provenance_json: obligation.provenance as unknown as Database['public']['Tables']['obligations']['Row']['provenance_json'],
        p_created_at: obligation.createdAt,
        p_updated_at: obligation.updatedAt,
        p_original_principal: details.original_principal,
        p_original_principal_prov: details.original_principal_prov,
        p_outstanding_balance: details.outstanding_balance ?? null,
        p_outstanding_balance_prov: details.outstanding_balance_prov ?? null,
        p_installment: details.installment,
        p_installment_prov: details.installment_prov,
        p_rate_type: details.rate_type,
        p_term_months: details.term_months,
        p_term_months_prov: details.term_months_prov,
        p_start_date: details.start_date,
        p_maturity_date: details.maturity_date,
        p_first_payment_date: details.first_payment_date ?? null,
        p_purpose: details.purpose ?? null,
        p_contractual_balloon: details.contractual_balloon ?? null,
        p_contractual_balloon_prov: details.contractual_balloon_prov ?? null,
      })
      if (error) return err(toSupabaseAppError(error))
    } else if (obligation.kind === 'murabaha') {
      const details = murabahaDetailsToRow(
        obligation.id,
        obligation.userId,
        obligation.murabahaDetails,
      )
      const { error } = await this.client.rpc('save_murabaha', {
        p_id: obligation.id,
        p_connection_type: obligation.connectionType,
        p_nickname: encryptedNickname,
        p_institution_name: obligation.institution.name,
        p_institution_id: obligation.institution.id ?? null,
        p_opened_date: obligation.openedDate,
        p_closed_date: obligation.closedDate ?? null,
        p_notes: encryptedNotes ?? null,
        p_provenance_json: obligation.provenance as unknown as Database['public']['Tables']['obligations']['Row']['provenance_json'],
        p_created_at: obligation.createdAt,
        p_updated_at: obligation.updatedAt,
        p_asset_cost: details.asset_cost,
        p_asset_cost_prov: details.asset_cost_prov,
        p_disclosed_profit: details.disclosed_profit,
        p_disclosed_profit_prov: details.disclosed_profit_prov,
        p_total_sale_price: details.total_sale_price,
        p_total_sale_price_prov: details.total_sale_price_prov,
        p_installment: details.installment,
        p_installment_prov: details.installment_prov,
        p_term_months: details.term_months,
        p_term_months_prov: details.term_months_prov,
        p_start_date: details.start_date,
        p_profit_rate_disclosed: details.profit_rate_disclosed ?? null,
      })
      if (error) return err(toSupabaseAppError(error))
    } else if (obligation.kind === 'creditCard') {
      const details = cardDetailsToRow(obligation.id, obligation.userId, obligation.cardDetails)
      const { error } = await this.client.rpc('save_card', {
        p_id: obligation.id,
        p_connection_type: obligation.connectionType,
        p_nickname: encryptedNickname,
        p_institution_name: obligation.institution.name,
        p_institution_id: obligation.institution.id ?? null,
        p_opened_date: obligation.openedDate,
        p_closed_date: obligation.closedDate ?? null,
        p_notes: encryptedNotes ?? null,
        p_provenance_json: obligation.provenance as unknown as Database['public']['Tables']['obligations']['Row']['provenance_json'],
        p_created_at: obligation.createdAt,
        p_updated_at: obligation.updatedAt,
        p_credit_limit: details.credit_limit,
        p_credit_limit_prov: details.credit_limit_prov,
        p_current_balance: details.current_balance,
        p_current_balance_prov: details.current_balance_prov,
        p_statement_balance: details.statement_balance ?? null,
        p_statement_balance_prov: details.statement_balance_prov ?? null,
        p_statement_date: details.statement_date ?? null,
        p_minimum_payment_rule_json: details.minimum_payment_rule_json ?? null,
        p_purchase_apr: details.purchase_apr ?? null,
        p_purchase_apr_prov: details.purchase_apr_prov ?? null,
        p_cash_advance_apr: details.cash_advance_apr ?? null,
        p_cash_advance_apr_prov: details.cash_advance_apr_prov ?? null,
        p_due_date: details.due_date ?? null,
        p_grace_days: details.grace_days ?? null,
        p_fees_json: details.fees_json ?? null,
      })
      if (error) return err(toSupabaseAppError(error))
    } else if (SCHEMA_BACKED_KINDS.has(obligation.kind)) {
      return err(makeError('unexpected', { safeMetadata: { unexpectedKind: 'true' } }))
    } else {
      // genericFacility/ijara/diminishingMusharakah: no detail table exists yet
      // (P1-scoped, see obligation-mapper.ts) — base row alone is the full
      // persisted representation, a single statement is already atomic.
      const { error: baseError } = await this.client.from('obligations').upsert({
        ...baseToRow(obligation),
        nickname: encryptedNickname,
        notes: encryptedNotes ?? null,
      })
      if (baseError) return err(toSupabaseAppError(baseError))
    }

    return this.get(obligation.id)
  }

  /** No `archived` column exists — archival is represented by setting `closedDate` (ObligationBase's own field). */
  async archive(id: Id<'obligation'>): Promise<Result<void, AppError>> {
    const { error } = await this.client
      .from('obligations')
      .update({ closed_date: localDateFromDate(new Date()) })
      .eq('id', id)
    if (error) return err(toSupabaseAppError(error))
    return ok(undefined)
  }

  /** Detail-table rows cascade via ON DELETE CASCADE (verified by Phase 3 pgTAP). */
  async delete(id: Id<'obligation'>): Promise<Result<void, AppError>> {
    const { error } = await this.client.from('obligations').delete().eq('id', id)
    if (error) return err(toSupabaseAppError(error))
    return ok(undefined)
  }
}
