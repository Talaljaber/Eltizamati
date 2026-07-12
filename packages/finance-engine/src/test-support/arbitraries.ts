/**
 * fast-check generators for the property-test charter
 * (calculation-test-vectors.md "Property-test charter"): principal
 * 100–1,000,000 JOD (3dp), rate 0–30%, term 1–480.
 *
 * All decimal strings are built from integer arithmetic only (no floating
 * division) — the same "no float math on values that become Money/Rate"
 * discipline as production code, even though these are test-only strings.
 */
import fc from 'fast-check'
import { Money, Rate, toLocalDate, type LocalDate } from '@eltizamati/domain'

function scaledIntToDecimalString(value: number, decimals: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const scale = 10 ** decimals
  const whole = Math.floor(abs / scale)
  const frac = abs % scale
  return `${sign}${whole}.${String(frac).padStart(decimals, '0')}`
}

/** Principal: 100.000–1,000,000.000 JOD. */
export function arbitraryPrincipal(): fc.Arbitrary<Money> {
  return fc
    .integer({ min: 100_000, max: 1_000_000_000 })
    .map((fils) => Money.of(scaledIntToDecimalString(fils, 3), 'JOD'))
}

/** Annual rate: 0%–30%, 3dp precision. */
export function arbitraryRate(): fc.Arbitrary<Rate> {
  return fc
    .integer({ min: 0, max: 30_000 })
    .map((milliPercent) => Rate.fromPercent(scaledIntToDecimalString(milliPercent, 3)))
}

/** Term: 1–480 months. */
export function arbitraryTermMonths(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: 480 })
}

export function arbitraryStartDate(): fc.Arbitrary<LocalDate> {
  return fc
    .integer({ min: 2015, max: 2030 })
    .chain((year) =>
      fc
        .integer({ min: 1, max: 12 })
        .map((month) => toLocalDate(`${String(year)}-${String(month).padStart(2, '0')}-01`)),
    )
}
