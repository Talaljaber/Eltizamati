/**
 * Font-family architecture tests (D2).
 *
 * Fonts are BLOCKED (assets not yet bundled) — the architecture must resolve to
 * the system font (undefined) rather than emit an unregistered family name.
 */
import { FONTS_AVAILABLE, fontFamilyConfig, fontRoleForWeight, resolveFontFamily } from '../fonts'

describe('fonts — blocked-asset safe architecture', () => {
  it('fonts are marked unavailable until licensed assets are bundled', () => {
    expect(FONTS_AVAILABLE).toBe(false)
  })

  it('resolveFontFamily returns undefined (system fallback) while blocked', () => {
    expect(resolveFontFamily('latin', '400')).toBeUndefined()
    expect(resolveFontFamily('latin', '700')).toBeUndefined()
    expect(resolveFontFamily('arabic', '400')).toBeUndefined()
    expect(resolveFontFamily('arabic', '700')).toBeUndefined()
  })

  it('declares the approved families for when assets land (Tajawal / Inter)', () => {
    expect(fontFamilyConfig.arabic.regular).toBe('Tajawal-Regular')
    expect(fontFamilyConfig.arabic.bold).toBe('Tajawal-Bold')
    expect(fontFamilyConfig.latin.regular).toBe('Inter-Regular')
    expect(fontFamilyConfig.latin.bold).toBe('Inter-Bold')
  })

  it('maps numeric weights to roles', () => {
    expect(fontRoleForWeight('400')).toBe('regular')
    expect(fontRoleForWeight('500')).toBe('medium')
    expect(fontRoleForWeight('600')).toBe('semibold')
    expect(fontRoleForWeight('700')).toBe('bold')
  })
})
