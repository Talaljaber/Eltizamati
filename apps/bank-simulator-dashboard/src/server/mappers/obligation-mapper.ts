/**
 * obligations (+ loan_details/murabaha_details/card_details) -> Obligation
 * mapper (read-only side, class-table inheritance per ADR-0008). Mirrors
 * apps/mobile/.../mappers/obligation-mapper.ts's *FromRow functions — the
 * dashboard never writes obligation rows directly (Phase 4's rate-campaign
 * publish flow only ever appends a `rate_periods` row via a dedicated RPC).
 *
 * Only the three schema-backed kinds (conventionalLoan/murabaha/creditCard)
 * have a detail table; `ijara`/`diminishingMusharakah`/`genericFacility`
 * have no detail table in this schema, so they map with base fields only —
 * `outstandingBalance` is never fabricated for them.
 */
import {
  brandId,
  DomainInvariantError,
  Money,
  Percentage,
  Rate,
  toLocalDate,
  type CardDetails,
  type CardFee,
  type ConventionalLoanDetails,
  type Institution,
  type LoanPurpose,
  type MinimumPaymentRule,
  type MurabahaDetails,
  type Obligation,
  type ObligationBase,
  type RateType,
  type Sourced,
} from '@eltizamati/domain'
import type { Database, Json } from '../supabase/database.types'
import { jsonToProvenance } from './provenance-json'
import { ratePeriodRowToDomain } from './rate-period-mapper'

type ObligationRow = Database['public']['Tables']['obligations']['Row']
type LoanDetailsRow = Database['public']['Tables']['loan_details']['Row']
type MurabahaDetailsRow = Database['public']['Tables']['murabaha_details']['Row']
type CardDetailsRow = Database['public']['Tables']['card_details']['Row']
type RatePeriodRow = Database['public']['Tables']['rate_periods']['Row']

// ─── Shared Sourced<T> column-pair helpers ────────────────────────────────────

function sourcedMoneyFromColumns(value: number, prov: Json, currency: string): Sourced<Money> {
  return { value: Money.of(String(value), currency), provenance: jsonToProvenance(prov) }
}

function optionalSourcedMoneyFromColumns(
  value: number | null,
  prov: Json | null,
  currency: string,
): Sourced<Money> | undefined {
  if (value === null || prov === null) return undefined
  return sourcedMoneyFromColumns(value, prov, currency)
}

function sourcedNumberFromColumns(value: number, prov: Json): Sourced<number> {
  return { value, provenance: jsonToProvenance(prov) }
}

function optionalSourcedRateFromColumns(
  value: number | null,
  prov: Json | null,
): Sourced<Rate> | undefined {
  if (value === null || prov === null) return undefined
  return { value: Rate.fromDecimal(String(value)), provenance: jsonToProvenance(prov) }
}

// ─── Base fields ───────────────────────────────────────────────────────────────

export function obligationBaseFromRow(row: ObligationRow): Omit<ObligationBase, 'kind'> {
  const institution: Institution =
    row.institution_id !== null
      ? { name: row.institution_name, id: row.institution_id }
      : { name: row.institution_name }
  return {
    id: brandId<'obligation'>(row.id),
    userId: brandId<'user'>(row.user_id),
    nickname: row.nickname,
    institution,
    currency: row.currency,
    openedDate: toLocalDate(row.opened_date),
    closedDate: row.closed_date !== null ? toLocalDate(row.closed_date) : undefined,
    notes: row.notes ?? undefined,
    provenance: jsonToProvenance(row.provenance_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Conventional loan ─────────────────────────────────────────────────────────

function toRateType(value: string): RateType {
  if (value === 'fixed' || value === 'variable' || value === 'mixed' || value === 'unknown') {
    return value
  }
  throw new DomainInvariantError(
    'validation',
    `Unexpected loan_details.rate_type value: "${value}"`,
  )
}

function toLoanPurpose(value: string | null): LoanPurpose | undefined {
  if (value === null) return undefined
  if (value === 'personal' || value === 'auto' || value === 'housing' || value === 'other') {
    return value
  }
  throw new DomainInvariantError('validation', `Unexpected loan_details.purpose value: "${value}"`)
}

export function loanDetailsFromRow(
  row: LoanDetailsRow,
  ratePeriodRows: readonly RatePeriodRow[],
  currency: string,
): ConventionalLoanDetails {
  if (row.payment_frequency !== 'monthly') {
    throw new DomainInvariantError(
      'validation',
      `Unexpected loan_details.payment_frequency value: "${row.payment_frequency}"`,
    )
  }
  return {
    originalPrincipal: sourcedMoneyFromColumns(
      row.original_principal,
      row.original_principal_prov,
      currency,
    ),
    outstandingBalance: optionalSourcedMoneyFromColumns(
      row.outstanding_balance,
      row.outstanding_balance_prov,
      currency,
    ),
    installment: sourcedMoneyFromColumns(row.installment, row.installment_prov, currency),
    rateType: toRateType(row.rate_type),
    ratePeriods: ratePeriodRows.map(ratePeriodRowToDomain),
    termMonths: sourcedNumberFromColumns(row.term_months, row.term_months_prov),
    startDate: toLocalDate(row.start_date),
    maturityDate: toLocalDate(row.maturity_date),
    firstPaymentDate:
      row.first_payment_date !== null ? toLocalDate(row.first_payment_date) : undefined,
    paymentFrequency: 'monthly',
    purpose: toLoanPurpose(row.purpose),
    contractualBalloon: optionalSourcedMoneyFromColumns(
      row.contractual_balloon,
      row.contractual_balloon_prov,
      currency,
    ),
  }
}

// ─── Murabaha ──────────────────────────────────────────────────────────────────

export function murabahaDetailsFromRow(row: MurabahaDetailsRow, currency: string): MurabahaDetails {
  return {
    totalSalePrice: sourcedMoneyFromColumns(
      row.total_sale_price,
      row.total_sale_price_prov,
      currency,
    ),
    assetCost: sourcedMoneyFromColumns(row.asset_cost, row.asset_cost_prov, currency),
    disclosedProfit: sourcedMoneyFromColumns(
      row.disclosed_profit,
      row.disclosed_profit_prov,
      currency,
    ),
    installment: sourcedMoneyFromColumns(row.installment, row.installment_prov, currency),
    termMonths: sourcedNumberFromColumns(row.term_months, row.term_months_prov),
    startDate: toLocalDate(row.start_date),
    profitRateDisclosed:
      row.profit_rate_disclosed !== null
        ? Rate.fromDecimal(String(row.profit_rate_disclosed))
        : undefined,
  }
}

// ─── Credit card ───────────────────────────────────────────────────────────────

function minimumPaymentRuleFromJson(
  value: Json | null,
  currency: string,
): MinimumPaymentRule | undefined {
  if (value === null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainInvariantError(
      'validation',
      'card_details.minimum_payment_rule_json is malformed',
    )
  }
  const shape = value as { type?: unknown; value?: unknown; floor?: unknown }
  if (shape.type === 'unknown') return { type: 'unknown' }
  if (shape.type === 'percent' && typeof shape.value === 'string') {
    return {
      type: 'percent',
      value: Percentage.of(shape.value),
      floor: typeof shape.floor === 'string' ? Money.of(shape.floor, currency) : undefined,
    }
  }
  if (shape.type === 'fixed' && typeof shape.value === 'string') {
    return { type: 'fixed', value: Money.of(shape.value, currency) }
  }
  throw new DomainInvariantError(
    'validation',
    'card_details.minimum_payment_rule_json is malformed',
  )
}

function feesFromJson(value: Json | null, currency: string): readonly CardFee[] | undefined {
  if (value === null) return undefined
  if (!Array.isArray(value)) {
    throw new DomainInvariantError('validation', 'card_details.fees_json is not an array')
  }
  return value.map((item) => {
    const shape = item as {
      type?: unknown
      amount?: unknown
      amount_prov?: unknown
      description?: unknown
    }
    if (
      typeof shape.type !== 'string' ||
      typeof shape.amount !== 'string' ||
      shape.amount_prov === undefined
    ) {
      throw new DomainInvariantError('validation', 'card_details.fees_json entry is malformed')
    }
    return {
      type: shape.type as CardFee['type'],
      amount: sourcedMoneyFromColumns(Number(shape.amount), shape.amount_prov as Json, currency),
      description: typeof shape.description === 'string' ? shape.description : undefined,
    }
  })
}

export function cardDetailsFromRow(row: CardDetailsRow, currency: string): CardDetails {
  return {
    creditLimit: sourcedMoneyFromColumns(row.credit_limit, row.credit_limit_prov, currency),
    currentBalance: sourcedMoneyFromColumns(
      row.current_balance,
      row.current_balance_prov,
      currency,
    ),
    statementBalance: optionalSourcedMoneyFromColumns(
      row.statement_balance,
      row.statement_balance_prov,
      currency,
    ),
    statementDate: row.statement_date !== null ? toLocalDate(row.statement_date) : undefined,
    minimumPaymentRule: minimumPaymentRuleFromJson(row.minimum_payment_rule_json, currency),
    purchaseApr: optionalSourcedRateFromColumns(row.purchase_apr, row.purchase_apr_prov),
    cashAdvanceApr: optionalSourcedRateFromColumns(row.cash_advance_apr, row.cash_advance_apr_prov),
    dueDate: row.due_date !== null ? toLocalDate(row.due_date) : undefined,
    graceDays: row.grace_days ?? undefined,
    fees: feesFromJson(row.fees_json, currency),
  }
}

// ─── Top-level assembly ─────────────────────────────────────────────────────────

export interface ObligationDetailRows {
  readonly loanDetails?: LoanDetailsRow
  readonly murabahaDetails?: MurabahaDetailsRow
  readonly cardDetails?: CardDetailsRow
  readonly ratePeriods: readonly RatePeriodRow[]
}

/**
 * Assembles one full `Obligation` from its base row plus whichever detail
 * row matches its `kind`. Throws if a schema-backed kind's detail row is
 * missing — mirrors the `dataIncomplete` "ghost obligation" case the atomic
 * write RPCs (supabase/migrations/20260715090000_...) exist to prevent; a
 * dashboard read encountering one is a genuine data problem to surface, not
 * something to paper over.
 */
export function assembleObligation(row: ObligationRow, detail: ObligationDetailRows): Obligation {
  const base = obligationBaseFromRow(row)

  switch (row.kind) {
    case 'conventionalLoan': {
      if (detail.loanDetails === undefined) {
        throw new DomainInvariantError(
          'dataIncomplete',
          `obligation ${row.id} is kind=conventionalLoan but has no loan_details row`,
        )
      }
      return {
        ...base,
        kind: 'conventionalLoan',
        loanDetails: loanDetailsFromRow(detail.loanDetails, detail.ratePeriods, row.currency),
      }
    }
    case 'murabaha': {
      if (detail.murabahaDetails === undefined) {
        throw new DomainInvariantError(
          'dataIncomplete',
          `obligation ${row.id} is kind=murabaha but has no murabaha_details row`,
        )
      }
      return {
        ...base,
        kind: 'murabaha',
        murabahaDetails: murabahaDetailsFromRow(detail.murabahaDetails, row.currency),
      }
    }
    case 'creditCard': {
      if (detail.cardDetails === undefined) {
        throw new DomainInvariantError(
          'dataIncomplete',
          `obligation ${row.id} is kind=creditCard but has no card_details row`,
        )
      }
      return {
        ...base,
        kind: 'creditCard',
        cardDetails: cardDetailsFromRow(detail.cardDetails, row.currency),
      }
    }
    case 'ijara':
      return { ...base, kind: 'ijara', outstandingBalance: undefined }
    case 'diminishingMusharakah':
      return { ...base, kind: 'diminishingMusharakah', outstandingBalance: undefined }
    case 'genericFacility':
      return { ...base, kind: 'genericFacility', outstandingBalance: undefined }
    default:
      throw new DomainInvariantError(
        'validation',
        `Unexpected obligations.kind value: "${row.kind}"`,
      )
  }
}
