import { defineConfig, devices } from '@playwright/test'

/**
 * Full E2E coverage (docs/dashboard.md §17) lands in Phase 5. This config
 * exists from Phase 1 so `pnpm --filter bank-simulator-dashboard test:e2e`
 * is a valid command throughout the build; `e2e/` currently holds only a
 * shell smoke test.
 */
const isCi = process.env.CI !== undefined && process.env.CI !== ''

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm run build && pnpm run start',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !isCi,
    timeout: 120_000,
    env: { PORT: '3100' },
  },
})
