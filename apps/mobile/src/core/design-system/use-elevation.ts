import { Platform, type ViewStyle } from 'react-native'
import { elevation } from './tokens'

/**
 * Resolves a tokenized elevation level (D7) to a platform-appropriate style:
 * iOS shadow props, Android `elevation`. Communicates real layering — use `card`
 * for elevated content and `sheet` for modals/sheets only. Do not hand-roll shadows.
 */
export function resolveElevation(level: 'card' | 'sheet'): ViewStyle {
  const token = elevation[level]
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: token.ios.shadowColor,
      shadowOpacity: token.ios.shadowOpacity,
      shadowRadius: token.ios.shadowRadius,
      shadowOffset: token.ios.shadowOffset,
    },
    android: { elevation: token.android.elevation },
    default: {},
  }) as ViewStyle
}
