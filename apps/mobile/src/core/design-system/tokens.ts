/**
 * Design tokens — Eltizamati Visual System (docs/02-ux/visual-direction.md).
 *
 * Color architecture has three tiers (do not collapse them):
 *   1. brandPalette   — raw identity-board values (D1). Brand-DISPLAY only:
 *                       large fills, brand moments, non-text glyphs. NEVER use
 *                       these directly for body text or small controls.
 *   2. accessible semantic roles (ColorScheme) — the ONLY colors feature code
 *                       consumes. Text/interactive roles are contrast-verified
 *                       derivatives of the brand palette (checked in tokens.test.ts).
 *   3. status/provenance roles — positive/attention/critical + official/user/estimate.
 *
 * Feature code must consume semantic roles, never brandPalette hexes or string
 * concatenation (e.g. `theme.critical + '20'` is forbidden — use *Soft tokens).
 */

// ─── Brand palette (D1) — identity-board display values, NOT for text/small controls ──

export const brandPalette = {
  navy: '#0F2343',
  teal: '#1FB5A9',
  mint: '#7ED6C6',
  gold: '#D9B45A',
  lightGray: '#F2F4F7',
  white: '#FFFFFF',
} as const

// ─── Color (semantic, theme-aware light/dark) ────────────────────────────────

export interface ColorScheme {
  // Surfaces (base → elevated → subtle → interactive → sheet)
  readonly bg: string
  readonly bgElevated: string
  readonly bgSubtle: string
  readonly bgInteractive: string
  readonly bgSheet: string
  // Content
  readonly textPrimary: string
  readonly textSecondary: string
  readonly textTertiary: string
  readonly textOnBrand: string
  // Brand — accessible action teal + identity display teal + soft tint
  readonly brand: string
  readonly brandDisplay: string
  readonly brandSoft: string
  // Understanding — accessible gold (text/interactive) + display gold + soft tint
  readonly understanding: string
  readonly understandingDisplay: string
  readonly understandingSoft: string
  // Support — mint (quiet supporting information)
  readonly support: string
  readonly supportSoft: string
  // Status
  readonly positive: string
  readonly positiveSoft: string
  readonly caution: string
  readonly cautionSoft: string
  /** Alias of caution — semantic name used by the visual direction. */
  readonly attention: string
  readonly attentionSoft: string
  readonly critical: string
  readonly criticalSoft: string
  readonly info: string
  readonly infoSoft: string
  // Provenance (ink + surface per class — never color-alone; always paired with icon+label)
  readonly official: string
  readonly officialSurface: string
  readonly userEntered: string
  readonly userEnteredSurface: string
  readonly estimate: string
  readonly estimateSurface: string
  // Structure
  readonly border: string
  readonly borderStrong: string
  readonly focus: string
}

const lightColors: ColorScheme = {
  bg: '#FAFBFC',
  bgElevated: '#FFFFFF',
  bgSubtle: '#F2F4F7',
  bgInteractive: '#ECEFF3',
  bgSheet: '#FFFFFF',
  textPrimary: '#0F2343', // brand navy — high contrast, on-brand
  textSecondary: '#4A5A6A',
  textTertiary: '#7A8896',
  textOnBrand: '#FFFFFF',
  brand: '#0F6E64', // accessible teal (6.1:1 on white) — actions, links, focus
  brandDisplay: '#1FB5A9', // identity teal — display fills only (fails text contrast)
  brandSoft: '#D9EEEB',
  understanding: '#8A6D1F', // accessible gold (4.9:1 on white) — explain text/icon
  understandingDisplay: '#D9B45A', // identity gold — display accent only (fails text contrast)
  understandingSoft: '#F7ECC6', // light gold tint
  support: '#7ED6C6', // mint display
  supportSoft: '#E6F5F1',
  positive: '#1E7A4C',
  positiveSoft: '#DFF3E7',
  caution: '#9A6B00',
  cautionSoft: '#FCEFCC',
  attention: '#9A6B00',
  attentionSoft: '#FCEFCC',
  critical: '#B3261E',
  criticalSoft: '#F9DEDC',
  info: '#3B5A8A',
  infoSoft: '#E1E9F7',
  official: '#0F6E64', // brand-tinted ink
  officialSurface: '#D9EEEB',
  userEntered: '#4A5A6A', // neutral ink
  userEnteredSurface: '#F2F4F7',
  estimate: '#55617A', // neutral slate (6.2:1) — replaces off-brand violet
  estimateSurface: '#EEF0F4',
  border: '#E3E6EB',
  borderStrong: '#C9CDD4',
  focus: '#0F6E64',
}

const darkColors: ColorScheme = {
  bg: '#0B1A30', // deep navy, not pure black
  bgElevated: '#0F2343', // brand navy as the elevated surface
  bgSubtle: '#16294A',
  bgInteractive: '#1E3350',
  bgSheet: '#152340',
  textPrimary: '#EDEFF2',
  textSecondary: '#B7C0C4',
  textTertiary: '#8A9498',
  textOnBrand: '#04201C',
  brand: '#5FCFC0', // brightened teal for dark surfaces
  brandDisplay: '#1FB5A9',
  brandSoft: '#153C38',
  understanding: '#E5C777', // brightened gold for dark
  understandingDisplay: '#D9B45A',
  understandingSoft: '#3A3113',
  support: '#7ED6C6',
  supportSoft: '#173A36',
  positive: '#7FD9A0',
  positiveSoft: '#173324',
  caution: '#E8C158',
  cautionSoft: '#3A2F12',
  attention: '#E8C158',
  attentionSoft: '#3A2F12',
  critical: '#F2B8B5',
  criticalSoft: '#42201E',
  info: '#A9C1E8',
  infoSoft: '#1E2C44',
  official: '#5FCFC0',
  officialSurface: '#153C38',
  userEntered: '#B7C0C4',
  userEnteredSurface: '#16294A',
  estimate: '#AEB6C6',
  estimateSurface: '#1E2838',
  border: '#2E393D',
  borderStrong: '#3F4B52',
  focus: '#5FCFC0',
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

// ─── Elevation (D7) — two restrained levels; communicates real layering ──────
//
// Cross-platform descriptors: iOS uses shadow*, Android uses elevation.
// Resolve with `resolveElevation(level)` (use-elevation.ts) so tokens stay
// import-pure and unit-testable. Do not add a third level or decorate flat surfaces.

export interface ElevationLevel {
  readonly ios: {
    readonly shadowColor: string
    readonly shadowOpacity: number
    readonly shadowRadius: number
    readonly shadowOffset: { readonly width: number; readonly height: number }
  }
  readonly android: { readonly elevation: number }
}

export const elevation: Record<'card' | 'sheet', ElevationLevel> = {
  // Level 1 — elevated content (cards, raised rows)
  card: {
    ios: {
      shadowColor: '#0F2343',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
  },
  // Level 2 — modal / sheet
  sheet: {
    ios: {
      shadowColor: '#0F2343',
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 12 },
  },
}

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
  | 'amountHero'
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
  // amountHero is the single dominant figure per screen — outranks display chrome.
  amountHero: { fontSize: 40, lineHeight: 46, fontWeight: '700' },
  amountLg: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  amountMd: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  amountSm: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
}

// ─── Motion ────────────────────────────────────────────────────────────────
//
// Durations + easing curves (cubic-bezier control points, framework-agnostic).
// Reduced-motion path: fades only, zero transl/scale duration — resolve with
// `motionDuration()` and the `useReducedMotion()` hook.

export const motion = {
  /** @deprecated use motion.duration.base */
  durationMs: 200,
  duration: { fast: 120, base: 200, slow: 280 },
  easing: {
    standard: [0.2, 0, 0, 1] as const,
    decelerate: [0, 0, 0, 1] as const,
    accelerate: [0.3, 0, 1, 1] as const,
  },
} as const

/** Pure reduced-motion resolver — returns 0 (instant) when motion is reduced. */
export function motionDuration(ms: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : ms
}

// ─── Touch targets (a11y) ──────────────────────────────────────────────────

export const minTouchTarget = 44

// ─── Responsive layout (web) ──────────────────────────────────────────────
//
// Native and narrow web render exactly as before — these tokens are only
// consumed behind an `isWideWeb` check (see `use-responsive-layout.ts`).

export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
} as const

export const layout = {
  sidebarWidth: 264,
  contentMaxWidth: 1120,
  readableMaxWidth: 760,
} as const
