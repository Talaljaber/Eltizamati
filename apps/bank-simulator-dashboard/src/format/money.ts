/**
 * Minimal money/rate display formatting — the dashboard's own copy since it
 * can't import `apps/mobile/src/core/formatting` (apps never import each
 * other). Deliberately simple for this phase: 3dp JOD, no locale-aware
 * grouping yet (Phase 5 adds AR/RTL number formatting).
 */
import type { Money, Rate } from '@eltizamati/domain'

export function formatMoney(money: Money): string {
  return `${money.round().toStorageString()} ${money.currency}`
}

export function formatRate(rate: Rate): string {
  return `${rate.toPercent().toFixed(3)}%`
}
