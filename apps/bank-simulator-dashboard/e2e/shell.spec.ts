import { test, expect } from '@playwright/test'

/** Shell smoke test — Phase 5 adds the full E2E suite (docs/dashboard.md §17). */
test('renders the demo banner and primary navigation', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByText('Demo environment — not an official bank or Central Bank system.'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bank Rate Simulator' })).toBeVisible()
})
