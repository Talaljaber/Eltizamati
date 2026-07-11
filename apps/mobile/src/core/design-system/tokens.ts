/**
 * Design tokens — "Calm Clarity" (docs/02-ux/design-system.md §1).
 *
 * Palette/typography are professional placeholders pending brand identity
 * (RES-005 / GAP-03) — structured for a one-file swap.
 */

// ─── Color (semantic, theme-aware light/dark) ────────────────────────────────

export interface ColorScheme {
  readonly bg: string
  readonly bgElevated: string
  readonly bgSubtle: string
  readonly textPrimary: string
  readonly textSecondary: string
  readonly textTertiary: string
  readonly brand: string
  readonly brandSoft: string
  readonly positive: string
  readonly positiveSoft: string
  readonly caution: string
  readonly cautionSoft: string
  readonly critical: string
  readonly criticalSoft: string
  readonly info: string
  readonly infoSoft: string
  readonly estimate: string
  readonly official: string
  readonly border: string
}

const lightColors: ColorScheme = {
  bg: '#FAFAF9',
  bgElevated: '#FFFFFF',
  bgSubtle: '#F2F1EE',
  textPrimary: '#1A2B3C',
  textSecondary: '#4A5A6A',
  textTertiary: '#7A8896',
  brand: '#0F6E64',
  brandSoft: '#D9EEEB',
  positive: '#1E7A4C',
  positiveSoft: '#DFF3E7',
  caution: '#9A6B00',
  cautionSoft: '#FCEFCC',
  critical: '#B3261E',
  criticalSoft: '#F9DEDC',
  info: '#3B5A8A',
  infoSoft: '#E1E9F7',
  estimate: '#6B5A78',
  official: '#0F6E64',
  border: '#E3E1DC',
}

const darkColors: ColorScheme = {
  bg: '#12181A',
  bgElevated: '#1B2326',
  bgSubtle: '#212B2E',
  textPrimary: '#EDEFF0',
  textSecondary: '#B7C0C4',
  textTertiary: '#8A9498',
  brand: '#5FCFC0',
  brandSoft: '#1E3C38',
  positive: '#7FD9A0',
  positiveSoft: '#1E3B2A',
  caution: '#E8C158',
  cautionSoft: '#3D3213',
  critical: '#F2B8B5',
  criticalSoft: '#4A2422',
  info: '#A9C1E8',
  infoSoft: '#22314A',
  estimate: '#C6B4D1',
  official: '#5FCFC0',
  border: '#2E393D',
}

export const colors = { light: lightColors, dark: darkColors }

// ─── Spacing (4-pt scale) ─────────────────────────────────────────────────────

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
} as const

// ─── Radius ────────────────────────────────────────────────────────────────

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const

// ─── Typography ────────────────────────────────────────────────────────────

export interface TypographyVariant {
  readonly fontSize: number
  readonly lineHeight: number
  readonly fontWeight: '400' | '500' | '600' | '700'
}

export const typography: Record<
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'amountLg'
  | 'amountMd'
  | 'amountSm',
  TypographyVariant
> = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  amountLg: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  amountMd: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  amountSm: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
}

// ─── Motion ────────────────────────────────────────────────────────────────

export const motion = {
  durationMs: 200,
} as const

// ─── Touch targets (a11y) ──────────────────────────────────────────────────

export const minTouchTarget = 44
