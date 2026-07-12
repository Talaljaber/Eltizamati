import { TextInput, View, StyleSheet } from 'react-native'
import { Text, space, radius, minTouchTarget, useTheme } from '@/core/design-system'

export interface AuthTextFieldProps {
  readonly label: string
  readonly value: string
  readonly onChangeText: (value: string) => void
  readonly placeholder?: string
  readonly secureTextEntry?: boolean
  readonly autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  readonly keyboardType?: 'default' | 'email-address'
  readonly editable?: boolean
  readonly testID?: string
}

/**
 * Shared email/password field for the three SCR-AUTH-* screens. Not yet a
 * core/design-system primitive — introduced here since auth is the first
 * feature needing a text input; promote it if a second feature needs one.
 */
export function AuthTextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  editable = true,
  testID,
}: AuthTextFieldProps) {
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
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        editable={editable}
        accessibilityLabel={label}
        testID={testID}
        style={[
          styles.input,
          {
            borderColor: theme.border,
            backgroundColor: theme.bgElevated,
            color: theme.textPrimary,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      />
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
