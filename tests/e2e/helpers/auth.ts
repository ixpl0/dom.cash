import type { APIRequestContext, Page } from '@playwright/test'
import { waitForHydration } from './wait-for-hydration'

export const TEST_USER = {
  username: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  mainCurrency: 'USD',
}

export const authenticateViaUI = async (page: Page) => {
  await page.goto('/auth')
  await waitForHydration(page)

  await page.getByTestId('username-input').fill(TEST_USER.username)
  await page.getByTestId('password-input').fill(TEST_USER.password)
  await page.getByTestId('submit-btn').click()

  await page.waitForURL('/')
  await waitForHydration(page)
}

export const cleanupUserData = async (request: APIRequestContext) => {
  const response = await request.delete('/api/test/cleanup-user-data')

  if (!response.ok()) {
    const body = await response.text()
    throw new Error(`User data cleanup failed: ${response.status()} - ${body}`)
  }

  return response
}
