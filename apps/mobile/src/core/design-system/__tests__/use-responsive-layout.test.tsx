/**
 * useResponsiveLayout tests — the single predicate (`isWideWeb`) every
 * web-shell branch keys off. Native and narrow web must resolve `false`.
 * The pure resolver is the primary coverage (RN's `useWindowDimensions`/
 * `Platform.OS` don't spy cleanly under jest-expo); the hook gets a smoke test.
 */
import { renderHook } from '@testing-library/react-native'
import { resolveResponsiveLayout, useResponsiveLayout } from '../use-responsive-layout'
import { breakpoints } from '../tokens'

describe('resolveResponsiveLayout', () => {
  it('is not wide-web on native, even at a wide width', () => {
    const result = resolveResponsiveLayout(1400, 'ios')
    expect(result).toEqual({ width: 1400, isWeb: false, isWide: true, isWideWeb: false })
  })

  it('is not wide-web on android at a wide width', () => {
    const result = resolveResponsiveLayout(1400, 'android')
    expect(result.isWideWeb).toBe(false)
  })

  it('is not wide-web on web below the lg breakpoint', () => {
    const result = resolveResponsiveLayout(breakpoints.lg - 1, 'web')
    expect(result).toEqual({
      width: breakpoints.lg - 1,
      isWeb: true,
      isWide: false,
      isWideWeb: false,
    })
  })

  it('is wide-web on web at or above the lg breakpoint', () => {
    const result = resolveResponsiveLayout(breakpoints.lg, 'web')
    expect(result).toEqual({ width: breakpoints.lg, isWeb: true, isWide: true, isWideWeb: true })
  })
})

describe('useResponsiveLayout', () => {
  it('renders without crashing and returns a well-shaped result', () => {
    const { result } = renderHook(() => useResponsiveLayout())
    expect(typeof result.current.width).toBe('number')
    expect(typeof result.current.isWeb).toBe('boolean')
    expect(typeof result.current.isWide).toBe('boolean')
    expect(result.current.isWideWeb).toBe(result.current.isWeb && result.current.isWide)
  })
})
