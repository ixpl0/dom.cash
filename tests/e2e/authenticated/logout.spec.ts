import { test, expect } from '@playwright/test'
import { registerUser } from '../helpers/auth'
import { createTestEmail } from '../helpers/users'

test.describe('Logout', () => {
  test('should end the session when clicking logout button', async ({ page }) => {
    await registerUser(page, createTestEmail('logout'), 'TestPassword123!')

    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()
    await userDropdown.click()

    const logoutButton = page.getByTestId('logout-btn')
    await expect(logoutButton).toBeVisible()
    const reloaded = page.waitForEvent('load')
    await logoutButton.click()
    await reloaded

    await page.waitForURL('/')

    await expect(page.getByTestId('login-btn')).toBeVisible()
    await expect(userDropdown).not.toBeVisible()

    await page.goto('/todo')
    await expect(page).toHaveURL('/auth?redirect=/todo')
  })
})
