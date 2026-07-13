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

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', dir: () => 'ltr' },
  }),
}))
