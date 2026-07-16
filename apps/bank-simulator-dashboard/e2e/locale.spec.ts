import { test, expect } from '@playwright/test'

/** Bilingual + RTL coverage for the required surfaces (docs/dashboard.md §15, Phase 5). */
test('switching to Arabic sets RTL direction and translates the nav', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.getByRole('link', { name: 'AR' }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.getByText('محاكي البنك الإلتزاماتي')).toBeVisible()
})

test('switching back to English restores LTR direction', async ({ page }) => {
  await page.goto('/?')
  await page.getByRole('link', { name: 'AR' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  await page.getByRole('link', { name: 'EN' }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('link', { name: 'Bank Rate Simulator' })).toBeVisible()
})
