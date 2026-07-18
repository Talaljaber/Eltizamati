import type { PressableStateCallbackType } from 'react-native'

/**
 * `Pressable`'s official style-callback type only has `pressed` — but
 * react-native-web also passes `hovered`/`focused` at runtime on web. This
 * widens the callback parameter (a strict superset of
 * `PressableStateCallbackType`, so it type-checks against the real prop)
 * purely so web-only hover/focus styling can read those fields; native
 * ignores them since RN never populates them there.
 */
export type WebPressableState = PressableStateCallbackType & {
  readonly hovered?: boolean
  readonly focused?: boolean
}
