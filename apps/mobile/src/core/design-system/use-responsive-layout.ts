import { Platform, useWindowDimensions } from 'react-native'
import { breakpoints } from './tokens'

export interface ResponsiveLayout {
  readonly width: number
  /** True on the `web` platform (any width). */
  readonly isWeb: boolean
  /** True when the viewport is at least `breakpoints.lg` wide. */
  readonly isWide: boolean
  /** True only when both — the single predicate the web shell keys off. */
  readonly isWideWeb: boolean
}

/**
 * Pure resolver — kept separate from the hook so it's testable without
 * mocking `useWindowDimensions`/`Platform.OS` (RN internals that don't spy
 * cleanly under jest-expo). The hook below is a thin wrapper.
 */
export function resolveResponsiveLayout(width: number, platformOS: string): ResponsiveLayout {
  const isWeb = platformOS === 'web'
  const isWide = width >= breakpoints.lg
  return { width, isWeb, isWide, isWideWeb: isWeb && isWide }
}

/**
 * Resolves the current viewport into a small set of layout predicates.
 * Native and narrow web always resolve `isWideWeb: false` — every web-shell
 * branch in the app is gated behind this so native rendering is unaffected.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width } = useWindowDimensions()
  return resolveResponsiveLayout(width, Platform.OS)
}
