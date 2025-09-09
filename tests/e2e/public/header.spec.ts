import { test, expect } from '@playwright/test'

test.describe('Header', () => {
  test('logo is clickable and leads to home page', async ({ page }) => {
    await page.goto('/')

    const logo = page.getByTestId('logo-link')
    await expect(logo).toBeVisible()
    await expect(logo).toContainText('dom.cash')

    await logo.click()
    await expect(page).toHaveURL('/')
  })

  test('unauthenticated header shows Login button leading to /auth', async ({ page }) => {
    await page.goto('/')
    const loginBtn = page.getByTestId('login-btn')
    await expect(loginBtn).toBeVisible()
    await loginBtn.click()
    await expect(page).toHaveURL('/auth')
  })
})
