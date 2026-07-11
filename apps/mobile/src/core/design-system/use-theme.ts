import { useColorScheme } from 'react-native'
import { colors, type ColorScheme } from './tokens'

/** Resolves the semantic color scheme for the current OS appearance. */
export function useTheme(): ColorScheme {
  const scheme = useColorScheme()
  return scheme === 'dark' ? colors.dark : colors.light
}
