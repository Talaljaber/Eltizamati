import { ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { radius, space, minTouchTarget } from '../tokens'
import { useTheme } from '../use-theme'
import { Text } from './Text'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

export interface ButtonProps {
  readonly label: string
  readonly onPress: () => void
  readonly variant?: ButtonVariant
  readonly loading?: boolean
  readonly disabled?: boolean
  readonly testID?: string
}

/** Button primitive — primary/secondary/ghost/destructive, loading state, min 44pt target (DS-3). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
}: ButtonProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const isDisabled = disabled || loading

  const backgroundByVariant: Record<ButtonVariant, string> = {
    primary: theme.brand,
    secondary: theme.brandSoft,
    ghost: 'transparent',
    destructive: theme.critical,
  }
  const textColorByVariant: Record<ButtonVariant, 'primary' | 'brand' | 'critical'> = {
    primary: 'primary',
    secondary: 'brand',
    ghost: 'brand',
    destructive: 'primary',
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: backgroundByVariant[variant],
          borderColor: variant === 'ghost' ? theme.border : 'transparent',
          borderWidth: variant === 'ghost' ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' ? theme.bgElevated : theme.brand}
          accessibilityLabel={t('common.loading')}
        />
      ) : (
        <Text variant="body" color={textColorByVariant[variant]} align="center">
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    paddingHorizontal: space[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
})
