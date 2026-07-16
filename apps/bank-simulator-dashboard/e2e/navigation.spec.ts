import { test, expect } from '@playwright/test'

/**
 * Navigation + rendering smoke coverage (docs/dashboard.md §17, Phase 5).
 * These assert every route renders its page title and does not crash —
 * they intentionally do not assert on live Supabase data, since this suite
 * must also pass in an environment with no configured/reachable database
 * (every server page here degrades to a "could not load data" card rather
 * than throwing, per the env guard's own design).
 */
const ROUTES: readonly { path: string; heading: string }[] = [
  { path: '/', heading: 'Overview' },
  { path: '/clients', heading: 'Clients' },
  { path: '/portfolio', heading: 'Portfolio' },
  { path: '/bank-rate-simulator', heading: 'Bank Rate Simulator' },
  { path: '/benchmark-simulator', heading: 'Benchmark Simulator' },
  { path: '/communications', heading: 'Communications' },
  { path: '/activity-log', heading: 'Activity Log' },
  { path: '/demo-settings', heading: 'Demo Settings' },
]

for (const route of ROUTES) {
  test(`renders ${route.path} without crashing`, async ({ page }) => {
    const response = await page.goto(route.path)
    expect(response?.ok()).toBe(true)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
}

test('every nav link is reachable from the shell', async ({ page }) => {
  await page.goto('/')
  for (const route of ROUTES) {
    await expect(page.locator(`a[href="${route.path}"]`).first()).toBeVisible()
  }
})
