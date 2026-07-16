import { test, expect } from '@playwright/test'

/**
 * Benchmark Simulator never auto-updates a contract (docs/dashboard.md
 * §7.F, Phase 5) — this must say so on the page regardless of whether a
 * database is reachable, since it is a static fact about this feature, not
 * a data-dependent computation.
 */
test('states that contract impact cannot be calculated and never claims otherwise', async ({
  page,
}) => {
  await page.goto('/benchmark-simulator')

  await expect(page.getByRole('heading', { name: 'Benchmark Simulator' })).toBeVisible()
  await expect(page.getByText(/never applied to a borrower's contract automatically/i)).toBeVisible()
})

test('the record-simulation form requires the core fields', async ({ page }) => {
  await page.goto('/benchmark-simulator')

  const benchmarkName = page.locator('input[name="benchmarkName"]')
  await expect(benchmarkName).toHaveAttribute('required', '')
  const previousRate = page.locator('input[name="previousRate"]')
  await expect(previousRate).toHaveAttribute('required', '')
  const newRate = page.locator('input[name="newRate"]')
  await expect(newRate).toHaveAttribute('required', '')
})
