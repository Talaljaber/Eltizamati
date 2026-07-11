import type { ReactNode } from 'react'
import { I18nManager, Text as RNText, type TextProps as RNTextProps } from 'react-native'
import { typography } from '../tokens'
import { useTheme } from '../use-theme'

/** Resolves a logical alignment ('start'/'end') to the physical value RN's TextStyle expects. */
function resolveTextAlign(
  align: 'start' | 'end' | 'center' | undefined,
): 'left' | 'right' | 'center' | undefined {
  if (align === undefined || align === 'center') return align
  const isStart = align === 'start'
  return isStart !== I18nManager.isRTL ? 'left' : 'right'
}

export type TextVariant = keyof typeof typography
export type TextColor =
  'primary' | 'secondary' | 'tertiary' | 'brand' | 'critical' | 'positive' | 'caution'

export interface TextPropsDS extends Omit<RNTextProps, 'style'> {
  readonly variant?: TextVariant
  readonly color?: TextColor
  /** Logical alignment only — never 'left'/'right' (design-system.md §3). */
  readonly align?: 'start' | 'end' | 'center'
  readonly children: ReactNode
}

/**
 * Direction-safe text primitive — the only way features render text (DS-3).
 * Uses `textAlign: start/end/center`, never 'left'/'right'.
 */
export function Text({
  variant = 'body',
  color = 'primary',
  align,
  children,
  ...rest
}: TextPropsDS) {
  const theme = useTheme()
  const variantStyle = typography[variant]
  const colorValue: Record<TextColor, string> = {
    primary: theme.textPrimary,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    brand: theme.brand,
    critical: theme.critical,
    positive: theme.positive,
    caution: theme.caution,
  }

  return (
    <RNText
      {...rest}
      style={[
        {
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontWeight: variantStyle.fontWeight,
          color: colorValue[color],
          textAlign: resolveTextAlign(align),
        },
        variant.startsWith('amount') ? { fontVariant: ['tabular-nums'] } : undefined,
      ]}
    >
      {children}
    </RNText>
  )
}
