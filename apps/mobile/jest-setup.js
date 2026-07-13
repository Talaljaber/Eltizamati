// @testing-library/react-native v13+: extend-expect is automatic, no import needed

// Native AsyncStorage is unavailable in Jest; individual suites may override
// this standard in-memory mock when they need precise storage assertions.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}))

// expo-linking's createURL reads the app manifest (expo-constants) to resolve
// a scheme, which isn't available in the Jest environment — real deep-link
// behavior is exercised on-device, not in unit tests.
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `eltizamati://${path}`),
  useURL: jest.fn(() => null),
  parse: jest.fn(() => ({ queryParams: {} })),
}))

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', dir: () => 'ltr' },
  }),
}))

// Mock @expo/vector-icons so icons render synchronously in tests.
// The real Icon async-loads its font glyph and setState()s after render,
// which triggers act(...) warnings and leaks a timer past teardown. Icons are
// decorative here (labels live on their parent), so a no-op stub is faithful.
jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  const { Text } = require('react-native')
  const Icon = ({ accessibilityLabel, testID }) =>
    React.createElement(Text, { accessibilityLabel, testID }, null)
  Icon.glyphMap = {}
  return { Ionicons: Icon }
})
