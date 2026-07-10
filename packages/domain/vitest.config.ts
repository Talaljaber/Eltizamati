import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Domain has no coverage gate (finance-engine does at ≥95%)
      // but we still collect for awareness
      reporter: ['text', 'lcov'],
    },
  },
})
