import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Header', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
  })

  test('logo is clickable and leads to home page', async ({ page }) => {
    const logo = page.getByTestId('logo-link')
    await expect(logo).toBeVisible()
    await expect(logo).toContainText('dom.cash')

    await logo.click()
    await expect(page).toHaveURL('/')
  })

  test('unauthenticated header shows Login button leading to /auth', async ({ page }) => {
    const loginBtn = page.getByTestId('login-btn')
    await expect(loginBtn).toBeVisible()
    await loginBtn.click()
    await expect(page).toHaveURL('/auth')
  })
})
