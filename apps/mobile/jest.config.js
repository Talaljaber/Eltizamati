module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  // Integration tests need a live local Supabase stack (`pnpm supabase:start`)
  // and are run separately via `test:integration` — excluded here so
  // `pnpm test`/`pnpm check` stay Docker-independent (Phase 4).
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
  // Transform all packages using non-standard JS (Flow types, JSX, ESM).
  //
  // Windows + pnpm path issue:
  //   Real path: node_modules\.pnpm\@react-native+js-polyfills@0.76.9\node_modules\@react-native\...
  //   After consuming one \ separator, lookahead sees \@react-native (not @react-native).
  //   Fix: consume ALL separators with [/\\]+ before the lookahead.
  //   Also: .pnpm virtual store directory must be in the allowlist so the first
  //   node_modules segment doesn't stop traversal.
  transformIgnorePatterns: [
    'node_modules[/\\\\]+(?!(\\.pnpm|(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?[/\\\\]|@expo-google-fonts|react-navigation|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|react-native-safe-area-context|@eltizamati|decimal\\.js))',
  ],
  moduleNameMapper: {
    // Resolve the @/ path alias (tsconfig paths → jest)
    '^@/(.*)$': '<rootDir>/src/$1',
    // TypeScript ESM packages use explicit .js extensions in import paths
    // (e.g. `export { Money } from './value-objects/money.js'`).
    // Jest resolves .ts source files directly, so strip the .js suffix.
    // Applied only to non-node_modules paths (workspace packages).
    '^(\\./|\\.\\./)(.+)\\.js$': '$1$2',
  },
}
