import { Platform, useColorScheme } from 'react-native'
import { colors, type ColorScheme } from './tokens'

/**
 * Resolves the semantic color scheme for the current OS appearance.
 *
 * Web always renders the light scheme: the browser's `prefers-color-scheme`
 * is an environment setting the user may not have deliberately chosen for
 * this app (unlike a phone's OS-level dark mode), so it should not silently
 * flip the desktop experience to dark while native keeps following the
 * device setting.
 */
export function useTheme(): ColorScheme {
  const scheme = useColorScheme()
  if (Platform.OS === 'web') return colors.light
  return scheme === 'dark' ? colors.dark : colors.light
}
