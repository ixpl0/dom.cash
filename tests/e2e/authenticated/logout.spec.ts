import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Logout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
  })

  test('should logout user and clear localStorage when clicking logout button', async ({ page }) => {
    const hasSessionBefore = await page.evaluate(() => localStorage.getItem('hasSession'))
    expect(hasSessionBefore).toBe('true')

    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()
    await userDropdown.click()

    const logoutButton = page.getByTestId('logout-btn')
    await expect(logoutButton).toBeVisible()
    await logoutButton.click()

    await page.waitForURL('/')

    // Check UI changes after logout
    const loginButton = page.getByTestId('login-btn')
    await expect(loginButton).toBeVisible()
    await expect(userDropdown).not.toBeVisible()

    // Check localStorage cleared after logout
    const hasSessionAfter = await page.evaluate(() => localStorage.getItem('hasSession'))
    expect(hasSessionAfter).toBeNull()
  })
})
