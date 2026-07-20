/**
 * obligations (+ loan_details/murabaha_details/card_details) <-> Obligation
 * mapper (class-table inheritance, ADR-0008). Only the three schema-backed
 * kinds are supported — `genericFacility`/`ijara`/`diminishingMusharakah`
 * are explicitly P1-scoped in the entity file itself ("P1 full support —
 * FR-OBL-010... deliberately minimal") and have no detail table in the
 * Phase 3 schema; `outstandingBalance` for those kinds has no column to
 * persist, so they map with base fields only (never fabricated).
 *
 * Money/Percentage/Rate columns are generated-type `number` — always routed
 * through a decimal string before reaching the value-object constructor
 * (see rate-period-mapper.ts for the precision rationale).
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
  type ObligationConnectionType,
  type RateType,
  type Sourced,
} from '@eltizamati/domain'
import type { Database, Json } from '../../../../core/supabase/database.types'
import { jsonToProvenance, provenanceToJson } from './provenance-json'
import { ratePeriodRowToDomain } from './rate-period-mapper'

type ObligationRow = Database['public']['Tables']['obligations']['Row']
type ObligationInsert = Database['public']['Tables']['obligations']['Insert']
type LoanDetailsRow = Database['public']['Tables']['loan_details']['Row']
type LoanDetailsInsert = Database['public']['Tables']['loan_details']['Insert']
type MurabahaDetailsRow = Database['public']['Tables']['murabaha_details']['Row']
type MurabahaDetailsInsert = Database['public']['Tables']['murabaha_details']['Insert']
type CardDetailsRow = Database['public']['Tables']['card_details']['Row']
type CardDetailsInsert = Database['public']['Tables']['card_details']['Insert']
type RatePeriodRow = Database['public']['Tables']['rate_periods']['Row']

// ─── Shared Sourced<T> column-pair helpers ────────────────────────────────────

function sourcedMoneyFromColumns(value: number, prov: Json, currency: string): Sourced<Money> {
  return { value: Money.of(String(value), currency), provenance: jsonToProvenance(prov) }
}

function sourcedMoneyToColumns(sourced: Sourced<Money>): { value: number; prov: Json } {
  return {
    value: Number(sourced.value.toStorageString()),
    prov: provenanceToJson(sourced.provenance),
  }
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

function sourcedNumberToColumns(sourced: Sourced<number>): { value: number; prov: Json } {
  return { value: sourced.value, prov: provenanceToJson(sourced.provenance) }
}

function optionalSourcedRateFromColumns(
  value: number | null,
  prov: Json | null,
): Sourced<Rate> | undefined {
  if (value === null || prov === null) return undefined
  return { value: Rate.fromDecimal(String(value)), provenance: jsonToProvenance(prov) }
}

function optionalSourcedRateToColumns(sourced: Sourced<Rate> | undefined): {
  value: number | null
  prov: Json | null
} {
  if (sourced === undefined) return { value: null, prov: null }
  return {
    value: Number(sourced.value.toStorageString()),
    prov: provenanceToJson(sourced.provenance),
  }
}

// ─── Base fields ───────────────────────────────────────────────────────────────

function toConnectionType(value: string): ObligationConnectionType {
  if (value === 'personal' || value === 'official') return value
  throw new DomainInvariantError(
    'validation',
    `Unexpected obligations.connection_type value: "${value}"`,
  )
}

function baseFromRow(row: ObligationRow): Omit<ObligationBase, 'kind'> {
  const institution: Institution =
    row.institution_id !== null
      ? { name: row.institution_name, id: row.institution_id }
      : { name: row.institution_name }
  return {
    id: brandId<'obligation'>(row.id),
    userId: brandId<'user'>(row.user_id),
    connectionType: toConnectionType(row.connection_type),
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

function baseToRow(obligation: Obligation): ObligationInsert {
  return {
    id: obligation.id,
    user_id: obligation.userId,
    kind: obligation.kind,
    connection_type: obligation.connectionType,
    nickname: obligation.nickname,
    institution_name: obligation.institution.name,
    institution_id: obligation.institution.id ?? null,
    currency: obligation.currency,
    opened_date: obligation.openedDate,
    closed_date: obligation.closedDate ?? null,
    notes: obligation.notes ?? null,
    provenance_json: provenanceToJson(obligation.provenance),
    created_at: obligation.createdAt,
    updated_at: obligation.updatedAt,
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

export function loanDetailsToRow(
  obligationId: string,
  userId: string,
  details: ConventionalLoanDetails,
): LoanDetailsInsert {
  const principal = sourcedMoneyToColumns(details.originalPrincipal)
  const installment = sourcedMoneyToColumns(details.installment)
  const term = sourcedNumberToColumns(details.termMonths)
  const outstanding = details.outstandingBalance
    ? sourcedMoneyToColumns(details.outstandingBalance)
    : { value: null, prov: null }
  const balloon = details.contractualBalloon
    ? sourcedMoneyToColumns(details.contractualBalloon)
    : { value: null, prov: null }
  return {
    obligation_id: obligationId,
    user_id: userId,
    original_principal: principal.value,
    original_principal_prov: principal.prov,
    outstanding_balance: outstanding.value,
    outstanding_balance_prov: outstanding.prov,
    installment: installment.value,
    installment_prov: installment.prov,
    rate_type: details.rateType,
    term_months: term.value,
    term_months_prov: term.prov,
    start_date: details.startDate,
    maturity_date: details.maturityDate,
    first_payment_date: details.firstPaymentDate ?? null,
    payment_frequency: details.paymentFrequency,
    purpose: details.purpose ?? null,
    contractual_balloon: balloon.value,
    contractual_balloon_prov: balloon.prov,
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

export function murabahaDetailsToRow(
  obligationId: string,
  userId: string,
  details: MurabahaDetails,
): MurabahaDetailsInsert {
  const totalSalePrice = sourcedMoneyToColumns(details.totalSalePrice)
  const assetCost = sourcedMoneyToColumns(details.assetCost)
  const disclosedProfit = sourcedMoneyToColumns(details.disclosedProfit)
  const installment = sourcedMoneyToColumns(details.installment)
  const term = sourcedNumberToColumns(details.termMonths)
  return {
    obligation_id: obligationId,
    user_id: userId,
    total_sale_price: totalSalePrice.value,
    total_sale_price_prov: totalSalePrice.prov,
    asset_cost: assetCost.value,
    asset_cost_prov: assetCost.prov,
    disclosed_profit: disclosedProfit.value,
    disclosed_profit_prov: disclosedProfit.prov,
    installment: installment.value,
    installment_prov: installment.prov,
    term_months: term.value,
    term_months_prov: term.prov,
    start_date: details.startDate,
    profit_rate_disclosed: details.profitRateDisclosed
      ? Number(details.profitRateDisclosed.toStorageString())
      : null,
  }
}

// ─── Credit card ───────────────────────────────────────────────────────────────

/** database-schema.md §1.5: `{"type":"percent","value":"3","floor":"10"} | {"type":"fixed","value":"25"} | {"type":"unknown"}` */
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

function minimumPaymentRuleToJson(rule: MinimumPaymentRule | undefined): Json | null {
  if (rule === undefined) return null
  if (rule.type === 'unknown') return { type: 'unknown' }
  if (rule.type === 'percent') {
    return {
      type: 'percent',
      value: rule.value.toStorageString(),
      ...(rule.floor ? { floor: rule.floor.toStorageString() } : {}),
    }
  }
  return { type: 'fixed', value: rule.value.toStorageString() }
}

/** database-schema.md §1.5: array of `{"type":...,"amount":"50","amount_prov":{...},"description?":"..."}` */
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

function feesToJson(fees: readonly CardFee[] | undefined): Json | null {
  if (fees === undefined) return null
  return fees.map((fee) => {
    const amount = sourcedMoneyToColumns(fee.amount)
    return {
      type: fee.type,
      amount: String(amount.value),
      amount_prov: amount.prov,
      ...(fee.description !== undefined ? { description: fee.description } : {}),
    }
  }) as unknown as Json
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

export function cardDetailsToRow(
  obligationId: string,
  userId: string,
  details: CardDetails,
): CardDetailsInsert {
  const creditLimit = sourcedMoneyToColumns(details.creditLimit)
  const currentBalance = sourcedMoneyToColumns(details.currentBalance)
  const statementBalance = details.statementBalance
    ? sourcedMoneyToColumns(details.statementBalance)
    : { value: null, prov: null }
  const purchaseApr = optionalSourcedRateToColumns(details.purchaseApr)
  const cashAdvanceApr = optionalSourcedRateToColumns(details.cashAdvanceApr)
  return {
    obligation_id: obligationId,
    user_id: userId,
    credit_limit: creditLimit.value,
    credit_limit_prov: creditLimit.prov,
    current_balance: currentBalance.value,
    current_balance_prov: currentBalance.prov,
    statement_balance: statementBalance.value,
    statement_balance_prov: statementBalance.prov,
    statement_date: details.statementDate ?? null,
    minimum_payment_rule_json: minimumPaymentRuleToJson(details.minimumPaymentRule),
    purchase_apr: purchaseApr.value,
    purchase_apr_prov: purchaseApr.prov,
    cash_advance_apr: cashAdvanceApr.value,
    cash_advance_apr_prov: cashAdvanceApr.prov,
    due_date: details.dueDate ?? null,
    grace_days: details.graceDays ?? null,
    fees_json: feesToJson(details.fees),
  }
}

// ─── Top-level assembly ─────────────────────────────────────────────────────────

export { baseFromRow, baseToRow }
