/**
 * Token-system tests — Eltizamati Visual System (Workstream 3).
 *
 * Covers: semantic token availability (light + dark), WCAG AA contrast
 * assumptions for text/interactive roles, amount-hierarchy dominance, and the
 * reduced-motion resolver. Contrast is computed here from the token hexes — no
 * expected value is imported from the code under test.
 */
import {
  colors,
  brandPalette,
  typography,
  elevation,
  motion,
  motionDuration,
  type ColorScheme,
} from '../tokens'

// ── WCAG relative-luminance + contrast (self-contained) ──────────────────────

function channel(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
function luminance(hex: string): number {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// ── Availability ─────────────────────────────────────────────────────────────

const REQUIRED_KEYS: (keyof ColorScheme)[] = [
  'bg',
  'bgElevated',
  'bgSubtle',
  'bgInteractive',
  'bgSheet',
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'textOnBrand',
  'brand',
  'brandDisplay',
  'brandSoft',
  'understanding',
  'understandingDisplay',
  'understandingSoft',
  'support',
  'supportSoft',
  'positive',
  'positiveSoft',
  'caution',
  'cautionSoft',
  'attention',
  'attentionSoft',
  'critical',
  'criticalSoft',
  'info',
  'infoSoft',
  'official',
  'officialSurface',
  'userEntered',
  'userEnteredSurface',
  'estimate',
  'estimateSurface',
  'border',
  'borderStrong',
  'focus',
]

describe('tokens — semantic availability', () => {
  it.each(['light', 'dark'] as const)('%s scheme defines every semantic role', (scheme) => {
    for (const key of REQUIRED_KEYS) {
      expect(typeof colors[scheme][key]).toBe('string')
      expect(colors[scheme][key]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('exposes the brand-display palette (D1) separately from semantic roles', () => {
    expect(brandPalette).toMatchObject({
      navy: '#0F2343',
      teal: '#1FB5A9',
      mint: '#7ED6C6',
      gold: '#D9B45A',
    })
  })
})

// ── Contrast assumptions (AA = 4.5:1 for text/interactive) ───────────────────

describe('tokens — light-theme text/interactive contrast (AA on elevated surface)', () => {
  const bg = colors.light.bgElevated // #FFFFFF — text sits on cards
  const textRoles: (keyof ColorScheme)[] = [
    'textPrimary',
    'textSecondary',
    'brand',
    'understanding',
    'official',
    'userEntered',
    'estimate',
    'positive',
    'caution',
    'critical',
    'info',
  ]
  it.each(textRoles)('%s meets 4.5:1 on the elevated surface', (role) => {
    expect(contrast(colors.light[role], bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('textOnBrand meets 4.5:1 on the accessible brand fill (button label)', () => {
    expect(contrast(colors.light.textOnBrand, colors.light.brand)).toBeGreaterThanOrEqual(4.5)
  })

  it('textOnBrand meets 4.5:1 on the critical fill (destructive button label)', () => {
    expect(contrast(colors.light.textOnBrand, colors.light.critical)).toBeGreaterThanOrEqual(4.5)
  })

  it('brand-display teal is intentionally NOT text-safe on white (display-only)', () => {
    // Documents D1: display values must not be used for text/small controls.
    expect(contrast(colors.light.brandDisplay, colors.light.bgElevated)).toBeLessThan(4.5)
  })
})

describe('tokens — dark-theme text contrast (AA on base surface)', () => {
  const bg = colors.dark.bg
  const textRoles: (keyof ColorScheme)[] = [
    'textPrimary',
    'textSecondary',
    'brand',
    'understanding',
    'positive',
    'info',
  ]
  it.each(textRoles)('%s meets 4.5:1 on the dark base surface', (role) => {
    expect(contrast(colors.dark[role], bg)).toBeGreaterThanOrEqual(4.5)
  })
})

// ── Amount hierarchy dominance ───────────────────────────────────────────────

describe('typography — amount dominance', () => {
  it('amountHero outranks display chrome', () => {
    expect(typography.amountHero.fontSize).toBeGreaterThan(typography.display.fontSize)
  })
  it('amount scale steps down predictably', () => {
    expect(typography.amountHero.fontSize).toBeGreaterThan(typography.amountLg.fontSize)
    expect(typography.amountLg.fontSize).toBeGreaterThan(typography.amountMd.fontSize)
    expect(typography.amountMd.fontSize).toBeGreaterThan(typography.amountSm.fontSize)
  })
})

// ── Elevation (D7) ───────────────────────────────────────────────────────────

describe('elevation — two restrained levels', () => {
  it('defines exactly card and sheet levels with cross-platform descriptors', () => {
    expect(Object.keys(elevation).sort()).toEqual(['card', 'sheet'])
    for (const level of ['card', 'sheet'] as const) {
      expect(typeof elevation[level].android.elevation).toBe('number')
      expect(typeof elevation[level].ios.shadowOpacity).toBe('number')
    }
  })
  it('sheet reads as more elevated than card', () => {
    expect(elevation.sheet.android.elevation).toBeGreaterThan(elevation.card.android.elevation)
  })
})

// ── Reduced motion ───────────────────────────────────────────────────────────

describe('motion — reduced-motion resolver', () => {
  it('collapses duration to 0 when reduced motion is on', () => {
    expect(motionDuration(motion.duration.base, true)).toBe(0)
  })
  it('preserves duration when reduced motion is off', () => {
    expect(motionDuration(motion.duration.base, false)).toBe(motion.duration.base)
  })
})
