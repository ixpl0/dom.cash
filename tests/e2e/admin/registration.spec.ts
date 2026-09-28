import type { Browser, Page } from '@playwright/test'
import { test, expect } from '../fixtures'
import { BASE_URL } from '../constants'
import { grantAdmin, registerUser } from '../helpers/auth'
import { createTestEmail } from '../helpers/users'
import { waitForHydration } from '../helpers/wait-for-hydration'

const PASSWORD = 'TestPassword123!'

const createVisitorPage = async (browser: Browser): Promise<Page> => {
  const context = await browser.newContext({ baseURL: BASE_URL, storageState: { cookies: [], origins: [] } })
  return context.newPage()
}

const openAuthPage = async (page: Page): Promise<void> => {
  await page.goto('/auth')
  await waitForHydration(page)
}

test.describe('Registration switch', () => {
  test.beforeEach(async ({ page }) => {
    await grantAdmin(page.request)
    await page.goto('/metrics')
    await waitForHydration(page)
  })

  test.afterEach(async ({ page }) => {
    await page.request.put('/api/admin/registration', { data: { mode: 'open' } })
  })

  test('closed registration hides the register button from visitors', async ({ page, browser }) => {
    const toggle = page.getByTestId('registration-toggle')
    await expect(toggle).toBeChecked()
    await expect(page.getByTestId('registration-open-temporarily')).toHaveCount(0)

    await toggle.click()
    await expect(toggle).not.toBeChecked()
    await expect(page.getByTestId('registration-open-temporarily')).toBeVisible()

    const visitorPage = await createVisitorPage(browser)
    await openAuthPage(visitorPage)
    await expect(visitorPage.getByTestId('registration-closed-notice')).toBeVisible()
    await expect(visitorPage.getByTestId('register-btn')).toHaveCount(0)
    await expect(visitorPage.getByTestId('login-btn')).toBeVisible()

    const response = await visitorPage.request.post('/api/auth/send-code', {
      data: { email: createTestEmail('closed') },
    })
    expect(response.status()).toBe(403)

    await toggle.click()
    await expect(toggle).toBeChecked()

    await openAuthPage(visitorPage)
    await expect(visitorPage.getByTestId('registration-closed-notice')).toHaveCount(0)
    await expect(visitorPage.getByTestId('register-btn')).toBeVisible()

    await visitorPage.context().close()
  })

  test('existing users sign in while registration is closed', async ({ page, browser, workerCredentials }) => {
    const toggle = page.getByTestId('registration-toggle')
    await toggle.click()
    await expect(toggle).not.toBeChecked()

    const visitorPage = await createVisitorPage(browser)
    await openAuthPage(visitorPage)
    await visitorPage.getByTestId('email-input').fill(workerCredentials.email)
    await visitorPage.getByTestId('password-input').fill(workerCredentials.password)
    await visitorPage.getByTestId('login-btn').click()

    await visitorPage.waitForURL('/')
    await expect(visitorPage.getByTestId('user-dropdown')).toBeVisible()

    await visitorPage.context().close()
  })

  test('registration opened for a while counts down and lets visitors register', async ({ page, browser }) => {
    const toggle = page.getByTestId('registration-toggle')
    await toggle.click()
    await expect(toggle).not.toBeChecked()

    await page.getByTestId('registration-open-temporarily').click()
    await expect(toggle).toBeChecked()
    await expect(page.getByTestId('registration-countdown')).toBeVisible()
    await expect(page.getByTestId('registration-status')).toContainText(/1[45]:\d{2}/)

    const visitorPage = await createVisitorPage(browser)
    await registerUser(visitorPage, createTestEmail('invited'), PASSWORD)
    await expect(visitorPage.getByTestId('user-dropdown')).toBeVisible()

    await visitorPage.context().close()
  })
})
