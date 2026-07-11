/**
 * Resolves a `MinimumPaymentRule` against a current balance.
 *
 * BR-CALC-016 (in spirit — "the engine never substitutes silent defaults for
 * material inputs"): the `unknown` rule variant must never be silently
 * treated as zero. Callers must handle `{ kind: 'unknown' }` as a distinct,
 * renderable state.
 *
 * This is rule application (pattern-match + a single multiplication), not a
 * projection/schedule — it stays a domain service; actual payoff simulation
 * (`cardPayoff.v1`) is finance-engine, Phase 6.
 */
import type { MinimumPaymentRule } from '../entities/obligation.js'
import type { Money } from '../value-objects/money.js'

export type MinimumPaymentResolution =
  { readonly kind: 'known'; readonly amount: Money } | { readonly kind: 'unknown' }

export function resolveMinimumPaymentDue(
  rule: MinimumPaymentRule,
  balance: Money,
): MinimumPaymentResolution {
  switch (rule.type) {
    case 'fixed':
      return { kind: 'known', amount: rule.value }
    case 'percent': {
      const computed = balance.multiplyBy(rule.value.toDecimalFraction().toString()).round()
      if (rule.floor && computed.isLessThan(rule.floor)) {
        return { kind: 'known', amount: rule.floor }
      }
      return { kind: 'known', amount: computed }
    }
    case 'unknown':
      return { kind: 'unknown' }
  }
}
