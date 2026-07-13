/**
 * Typography font-family architecture (D2 — Tajawal Arabic, Inter Latin).
 *
 * ⚠ BLOCKED ASSET STEP: the approved font files are NOT yet bundled in the repo
 * (no `assets/fonts/*.ttf`, no `useFonts`/`Font.loadAsync` wiring). Per D2 and the
 * Phase 8.5 stop conditions, font files must NOT be downloaded or invented without
 * owner approval. Until the licensed assets land, `FONTS_AVAILABLE` stays false and
 * every role resolves to `undefined`, so React Native falls back to the system font
 * safely (no unregistered-family warnings, no crash).
 *
 * TO ACTIVATE once approved assets are added:
 *   1. Place the .ttf files under `apps/mobile/assets/fonts/`.
 *   2. Load them at app start via `expo-font` `useFonts({ 'Tajawal-Regular': require(...), ... })`
 *      (the `expo-font` plugin is already declared in app.json).
 *   3. Flip `FONTS_AVAILABLE` to true.
 * No change to `Text` or feature code is required — it already consumes `resolveFontFamily`.
 */

export type FontScript = 'arabic' | 'latin'
export type FontRole = 'regular' | 'medium' | 'semibold' | 'bold'

/** Registered family names, keyed by script + role — the contract font loading must satisfy. */
export const fontFamilyConfig: Record<FontScript, Record<FontRole, string>> = {
  arabic: {
    regular: 'Tajawal-Regular',
    medium: 'Tajawal-Medium',
    semibold: 'Tajawal-Medium', // Tajawal ships no SemiBold; Medium is the nearest weight
    bold: 'Tajawal-Bold',
  },
  latin: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
}

/**
 * Flip to `true` only after the licensed font assets are bundled and loaded.
 * While false, the system font is used everywhere (safe fallback).
 */
export const FONTS_AVAILABLE = false

/** Maps a numeric font weight to a font role. */
export function fontRoleForWeight(weight: '400' | '500' | '600' | '700'): FontRole {
  switch (weight) {
    case '700':
      return 'bold'
    case '600':
      return 'semibold'
    case '500':
      return 'medium'
    default:
      return 'regular'
  }
}

/**
 * Resolves the fontFamily for a given script + weight.
 * Returns `undefined` (system fallback) while fonts are unavailable — do not
 * emit a family name that isn't registered.
 */
export function resolveFontFamily(
  script: FontScript,
  weight: '400' | '500' | '600' | '700',
): string | undefined {
  if (!FONTS_AVAILABLE) return undefined
  return fontFamilyConfig[script][fontRoleForWeight(weight)]
}
