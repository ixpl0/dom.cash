import { test as base, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/wait-for-hydration'
import { DEV_VERIFICATION_CODE } from '../constants'

const test = base.extend<{ isolatedPage: typeof base }>({})

test.describe('Logout', () => {
  test('should logout user and clear localStorage when clicking logout button', async ({ page }) => {
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const email = `logout_test_${uniqueId}@example.com`
    const password = 'TestPassword123!'

    await page.goto('/auth')
    await waitForHydration(page)

    await page.getByTestId('email-input').fill(email)
    await page.getByTestId('password-input').fill(password)
    await page.getByTestId('register-btn').click()

    await page.getByTestId('verification-code-input').waitFor({ state: 'visible', timeout: 10000 })
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()

    await page.waitForURL('/')
    await waitForHydration(page)

    const hasSessionBefore = await page.evaluate(() => localStorage.getItem('hasSession'))
    expect(hasSessionBefore).toBe('true')

    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()
    await userDropdown.click()

    const logoutButton = page.getByTestId('logout-btn')
    await expect(logoutButton).toBeVisible()
    await logoutButton.click()

    await page.waitForURL('/')

    const loginButton = page.getByTestId('login-btn')
    await expect(loginButton).toBeVisible()
    await expect(userDropdown).not.toBeVisible()

    const hasSessionAfter = await page.evaluate(() => localStorage.getItem('hasSession'))
    expect(hasSessionAfter).toBeNull()
  })
})
