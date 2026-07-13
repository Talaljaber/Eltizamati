import { TextInput, View, StyleSheet } from 'react-native'
import { Text } from './Text'
import { space, radius, minTouchTarget } from '../tokens'
import { useTheme } from '../use-theme'

export interface TextFieldProps {
  readonly label: string
  readonly value: string
  readonly onChangeText: (value: string) => void
  readonly placeholder?: string
  readonly keyboardType?: 'default' | 'numeric' | 'decimal-pad'
  readonly error?: string
  readonly editable?: boolean
  readonly testID?: string
}

/**
 * Shared text/numeric input for manual-entry forms (Phase 8) — promoted
 * from the single-purpose AuthTextField now that a second feature needs one.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  error,
  editable = true,
  testID,
}: TextFieldProps) {
  const theme = useTheme()

  return (
    <View style={styles.group}>
      <Text variant="bodySmall" color="secondary">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize="sentences"
        autoCorrect={false}
        editable={editable}
        accessibilityLabel={label}
        testID={testID}
        style={[
          styles.input,
          {
            borderColor: error === undefined ? theme.border : theme.critical,
            backgroundColor: theme.bgElevated,
            color: theme.textPrimary,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      />
      {error !== undefined && (
        <Text variant="caption" color="critical">
          {error}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: space[1],
  },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    fontSize: 16,
  },
})
