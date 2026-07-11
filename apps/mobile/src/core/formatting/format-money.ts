/**
 * Money formatting — the single home for rendering `Money` as display text
 * (system-architecture.md §7; DS-2: no feature may format money itself).
 *
 * Operates on the canonical decimal string only — never converts to a JS
 * `number` (that would risk float precision loss for display of large sums).
 */
import type { Money } from '@eltizamati/domain'

function groupThousands(integerDigits: string): string {
  const negative = integerDigits.startsWith('-')
  const digits = negative ? integerDigits.slice(1) : integerDigits
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return negative ? `-${grouped}` : grouped
}

/** Official figure: rounded to the currency's canonical decimal places, thousands separators. */
export function formatMoneyOfficial(money: Money, currencyLabel: string): string {
  const [intPart, decPart] = money.round().toStorageString().split('.')
  const grouped = groupThousands(intPart ?? '0')
  return decPart ? `${grouped}.${decPart} ${currencyLabel}` : `${grouped} ${currencyLabel}`
}

/** Estimated figure: whole-unit rounding + "≈" prefix (BR-CALC-014). */
export function formatMoneyEstimate(money: Money, currencyLabel: string): string {
  const [intPart] = money.roundToWhole().toStorageString().split('.')
  return `≈ ${groupThousands(intPart ?? '0')} ${currencyLabel}`
}
