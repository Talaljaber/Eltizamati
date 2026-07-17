/**
 * Bank Rate Simulator eligibility (docs/dashboard.md §E + the variable-rate
 * correction's "## Eligibility" section). Included: conventional loans,
 * variable-rate, known current balance, known current rate, matching the
 * chosen institution, allowlisted (guaranteed by construction — every
 * `Obligation` reaching this function already came from an allowlisted
 * query). Every exclusion carries an explicit, distinct reason — "Show the
 * reason for every exclusion."
 *
 * `installment` and `maturityDate` are non-optional in `ConventionalLoanDetails`
 * (`docs/05-data-api/database-schema.md` §1.3), so "missing installment" /
 * "missing maturity" are not representable exclusion cases for a loan that
 * has actually been persisted — this module doesn't fabricate checks the
 * type system already guarantees can't fail.
 */
import {
  isConventionalLoan,
  type ConventionalLoan,
  type Obligation,
  type Rate,
} from '@eltizamati/domain'

export type EligibilityExclusionReason =
  | 'notConventionalLoan'
  | 'fixedRate'
  | 'mixedOrUnknownRate'
  | 'institutionMismatch'
  | 'missingCurrentRate'
  | 'missingBalance'
  | 'closed'

export const EXCLUSION_REASON_LABEL: Record<EligibilityExclusionReason, string> = {
  notConventionalLoan:
    'Not a conventional loan (Murabaha, Ijara, diminishing Musharakah, or credit card)',
  fixedRate: 'Fixed-rate loan',
  mixedOrUnknownRate: 'Rate type is mixed or unknown, not variable',
  institutionMismatch: 'Belongs to a different institution',
  missingCurrentRate: 'No known current rate (no active rate period)',
  missingBalance: 'No known current outstanding balance',
  closed: 'Obligation is closed',
}

export interface EligibleLoan {
  readonly obligation: ConventionalLoan
  readonly currentRate: Rate
}

export interface ExcludedObligation {
  readonly obligationId: string
  readonly nickname: string
  readonly institution: string
  readonly reason: EligibilityExclusionReason
}

export interface EligibilityResult {
  readonly eligible: readonly EligibleLoan[]
  readonly excluded: readonly ExcludedObligation[]
}

function currentActiveRate(loan: ConventionalLoan): Rate | undefined {
  const active = loan.loanDetails.ratePeriods.filter((p) => p.supersededBy === undefined)
  if (active.length === 0) return undefined
  const latest = [...active].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]
  return latest?.annualRate
}

/**
 * `institution: undefined` means "every institution" — used by the "apply to
 * all banks" flow, which fans a single admin action out into one publish per
 * distinct institution among the eligible loans (see actions.ts). The
 * institution-mismatch exclusion simply never fires in that mode.
 */
export function evaluateRateCampaignEligibility(
  obligations: readonly Obligation[],
  institution: string | undefined,
): EligibilityResult {
  const eligible: EligibleLoan[] = []
  const excluded: ExcludedObligation[] = []

  for (const obligation of obligations) {
    if (!isConventionalLoan(obligation)) {
      excluded.push({
        obligationId: obligation.id,
        nickname: obligation.nickname,
        institution: obligation.institution.name,
        reason: 'notConventionalLoan',
      })
      continue
    }

    if (obligation.closedDate !== undefined) {
      excluded.push({
        obligationId: obligation.id,
        nickname: obligation.nickname,
        institution: obligation.institution.name,
        reason: 'closed',
      })
      continue
    }

    if (institution !== undefined && obligation.institution.name !== institution) {
      excluded.push({
        obligationId: obligation.id,
        nickname: obligation.nickname,
        institution: obligation.institution.name,
        reason: 'institutionMismatch',
      })
      continue
    }

    if (obligation.loanDetails.rateType === 'fixed') {
      excluded.push({
        obligationId: obligation.id,
        nickname: obligation.nickname,
        institution: obligation.institution.name,
        reason: 'fixedRate',
      })
      continue
    }

    if (obligation.loanDetails.rateType !== 'variable') {
      excluded.push({
        obligationId: obligation.id,
        nickname: obligation.nickname,
        institution: obligation.institution.name,
        reason: 'mixedOrUnknownRate',
      })
      continue
    }

    if (obligation.loanDetails.outstandingBalance === undefined) {
      excluded.push({
        obligationId: obligation.id,
        nickname: obligation.nickname,
        institution: obligation.institution.name,
        reason: 'missingBalance',
      })
      continue
    }

    const currentRate = currentActiveRate(obligation)
    if (currentRate === undefined) {
      excluded.push({
        obligationId: obligation.id,
        nickname: obligation.nickname,
        institution: obligation.institution.name,
        reason: 'missingCurrentRate',
      })
      continue
    }

    eligible.push({ obligation, currentRate })
  }

  return { eligible, excluded }
}
