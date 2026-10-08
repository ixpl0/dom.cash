import { test, expect } from '@playwright/test'
import { logout, registerUser } from '../helpers/auth'
import { createTestEmail } from '../helpers/users'
import { waitForHydration } from '../helpers/wait-for-hydration'

const PASSWORD = 'TestPassword123!'

test.describe('Logout', () => {
  test('should end the session when clicking logout button', async ({ page }) => {
    await registerUser(page, createTestEmail('logout'), PASSWORD)

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

  test('should send other tabs to the sign-in page', async ({ page, context }) => {
    await registerUser(page, createTestEmail('logout-tabs'), PASSWORD)

    const otherPage = await context.newPage()
    await otherPage.goto('/todo')
    await waitForHydration(otherPage)
    await expect(otherPage.getByTestId('user-dropdown')).toBeVisible()

    await logout(page)

    await expect(otherPage).toHaveURL('/auth?redirect=/todo')
    await expect(otherPage.getByTestId('user-dropdown')).not.toBeVisible()
  })

  test('should send the tab to the sign-in page when the session is gone', async ({ page, context }) => {
    await registerUser(page, createTestEmail('logout-expired'), PASSWORD)
    const budgetSubscribed = page.waitForResponse(response =>
      response.url().includes('/api/notifications/subscribe/') && response.ok())
    const overdueCountLoaded = page.waitForResponse(response =>
      response.url().includes('/api/todo/overdue-count') && response.ok())
    await page.goto('/budget')
    await waitForHydration(page)
    await Promise.all([budgetSubscribed, overdueCountLoaded])

    await context.clearCookies()
    await page.getByTestId('todo-btn').click()

    await expect(page).toHaveURL('/auth?redirect=/todo')
    await expect(page.getByTestId('user-dropdown')).not.toBeVisible()
  })
})
