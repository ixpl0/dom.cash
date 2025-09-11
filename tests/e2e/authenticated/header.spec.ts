import { test, expect } from '@playwright/test'

test.describe('Authenticated Header', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display user information', async ({ page }) => {
    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()
    await userDropdown.click()
    const logoutButton = page.getByTestId('logout-btn')
    await expect(logoutButton).toBeVisible()
  })

  test('should have share button in header', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await expect(shareButton).toBeVisible()
  })

  test('should have shared budgets button in header', async ({ page }) => {
    const sharedBudgetsButton = page.getByTestId('shared-budgets-btn')
    await expect(sharedBudgetsButton).toBeVisible()
  })
})
