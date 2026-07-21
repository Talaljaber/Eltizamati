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
  /** Masks input (dots) — for password-like fields. Also implied by the platform when true. */
  readonly secureTextEntry?: boolean
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
  secureTextEntry = false,
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
        secureTextEntry={secureTextEntry}
        accessibilityLabel={label}
        testID={testID}
        // Manual-entry fields (amounts, nicknames, terms) are never autofill
        // candidates — without this Android's autofill/suggestion service can
        // paint the field yellow and, on some OEM keyboards, swallow the
        // first tap intended for typing instead of focusing the input.
        autoComplete="off"
        importantForAutofill="no"
        textContentType="none"
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
