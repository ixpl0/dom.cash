import { test, expect } from '@playwright/test'

test.describe('Logout', () => {
  test('should logout user when clicking logout button', async ({ page }) => {
    await page.goto('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()
    await userDropdown.click()

    const logoutButton = page.getByTestId('logout-btn')
    await expect(logoutButton).toBeVisible()
    await logoutButton.click()

    await expect(page).toHaveURL('/')

    await expect(userDropdown).not.toBeVisible()

    const loginForm = page.getByTestId('login-form')
    await expect(loginForm).toBeVisible()
  })

  test('should clear localStorage on logout', async ({ page }) => {
    await page.goto('/')

    const hasSessionBefore = await page.evaluate(() => localStorage.getItem('hasSession'))
    expect(hasSessionBefore).toBe('true')

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()

    const logoutButton = page.getByTestId('logout-btn')
    await logoutButton.click()

    await page.waitForURL('/')

    const hasSessionAfter = await page.evaluate(() => localStorage.getItem('hasSession'))
    expect(hasSessionAfter).toBeNull()
  })
})
