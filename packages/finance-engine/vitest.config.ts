import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Property tests run hundreds of iterations over full schedule builds;
    // under v8 coverage instrumentation that exceeds vitest's 5s default.
    testTimeout: 120_000,
    coverage: {
      provider: 'v8',
      // ≥95% engine coverage is a CI gate (ADR-0011, ci-cd-environments.md §1)
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
      reporter: ['text', 'lcov'],
      exclude: [
        'src/index.ts',
        '**/*.test.ts',
        'vitest.config.ts',
        'src/registry/types.ts',
        'src/test-support/**',
      ],
    },
  },
})
