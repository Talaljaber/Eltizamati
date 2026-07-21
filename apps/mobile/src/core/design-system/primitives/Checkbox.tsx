import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '../use-theme'
import { minTouchTarget, space } from '../tokens'
import { Text } from './Text'

export interface CheckboxProps {
  readonly checked: boolean
  readonly onToggle: () => void
  readonly label: string
  /** Secondary line under the label — e.g. an amount that disambiguates two
   * rows sharing the same kind label (two "Loan" rows from the same bank). */
  readonly sublabel?: string
  readonly disabled?: boolean
  readonly testID?: string
}

/**
 * Checkbox primitive — extracted from the onboarding consent screen's inline
 * pattern (connect-plan.md Phase E) so the selection list in `/connect-bank`
 * and `onboarding/consent.tsx` share one implementation instead of two
 * hand-rolled copies drifting apart.
 */
export function Checkbox({
  checked,
  onToggle,
  label,
  sublabel,
  disabled = false,
  testID,
}: CheckboxProps) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      testID={testID}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? theme.brand : theme.border,
            backgroundColor: checked ? theme.brand : 'transparent',
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {checked ? (
          <Text variant="caption" color="primary" align="center">
            {'✓'}
          </Text>
        ) : null}
      </View>
      <View style={styles.label}>
        <Text variant="body">{label}</Text>
        {sublabel !== undefined ? (
          <Text variant="bodySmall" color="secondary">
            {sublabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    minHeight: minTouchTarget,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  label: {
    flex: 1,
    justifyContent: 'center',
  },
})
