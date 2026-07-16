/**
 * Allowlist-gated obligation reads. Fetches the base row plus every detail
 * table (class-table inheritance, ADR-0008) and rate history, then
 * assembles each into a full `Obligation` via the read-only mapper. Every
 * query filters to `assertAllowlistConfigured()`'s user-id list.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok, makeError, type AppError, type Obligation, type Result } from '@eltizamati/domain'
import { assertAllowlistConfigured } from '../allowlist'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import type { Database } from '../supabase/database.types'
import { assembleObligation, type ObligationDetailRows } from '../mappers/obligation-mapper'

type Client = SupabaseClient<Database>
type ObligationRow = Database['public']['Tables']['obligations']['Row']
type LoanDetailsRow = Database['public']['Tables']['loan_details']['Row']
type MurabahaDetailsRow = Database['public']['Tables']['murabaha_details']['Row']
type CardDetailsRow = Database['public']['Tables']['card_details']['Row']
type RatePeriodRow = Database['public']['Tables']['rate_periods']['Row']

async function fetchByAllowlist<T>(
  client: Client,
  table: keyof Database['public']['Tables'],
  allowedUserIds: readonly string[],
): Promise<Result<readonly T[], AppError>> {
  const { data, error } = await client.from(table).select('*').in('user_id', allowedUserIds)
  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }
  return ok(data as unknown as readonly T[])
}

function groupBy<T extends { obligation_id: string }>(rows: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const existing = map.get(row.obligation_id)
    if (existing !== undefined) existing.push(row)
    else map.set(row.obligation_id, [row])
  }
  return map
}

function indexBy<T extends { obligation_id: string }>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.obligation_id, row]))
}

export async function listAllowlistedObligations(): Promise<
  Result<readonly Obligation[], AppError>
> {
  const allowedUserIds = assertAllowlistConfigured()

  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult
  const client = clientResult.value

  const [obligationsResult, loanResult, murabahaResult, cardResult, rateResult] = await Promise.all(
    [
      fetchByAllowlist<ObligationRow>(client, 'obligations', allowedUserIds),
      fetchByAllowlist<LoanDetailsRow>(client, 'loan_details', allowedUserIds),
      fetchByAllowlist<MurabahaDetailsRow>(client, 'murabaha_details', allowedUserIds),
      fetchByAllowlist<CardDetailsRow>(client, 'card_details', allowedUserIds),
      fetchByAllowlist<RatePeriodRow>(client, 'rate_periods', allowedUserIds),
    ],
  )

  if (!obligationsResult.ok) return obligationsResult
  if (!loanResult.ok) return loanResult
  if (!murabahaResult.ok) return murabahaResult
  if (!cardResult.ok) return cardResult
  if (!rateResult.ok) return rateResult

  const loanByObligationId = indexBy(loanResult.value)
  const murabahaByObligationId = indexBy(murabahaResult.value)
  const cardByObligationId = indexBy(cardResult.value)
  const ratesByObligationId = groupBy(rateResult.value)

  const obligations = obligationsResult.value.map((row) => {
    const detail: ObligationDetailRows = {
      loanDetails: loanByObligationId.get(row.id),
      murabahaDetails: murabahaByObligationId.get(row.id),
      cardDetails: cardByObligationId.get(row.id),
      ratePeriods: ratesByObligationId.get(row.id) ?? [],
    }
    return assembleObligation(row, detail)
  })

  return ok(obligations)
}
