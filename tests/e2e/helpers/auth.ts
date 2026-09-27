import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { BASE_URL } from '../constants'

const SKIPPED_STATUSES = [400, 401]

export const cleanupUserData = async (request: APIRequestContext) => {
  const response = await request.delete(`${BASE_URL}/api/test/cleanup-user-data`)

  if (!response.ok() && !SKIPPED_STATUSES.includes(response.status())) {
    throw new Error(`User data cleanup failed with status ${response.status()}: ${await response.text()}`)
  }

  return response
}

export const logout = async (page: Page): Promise<void> => {
  await page.getByTestId('user-dropdown').click()
  const reloaded = page.waitForEvent('load')
  await page.getByTestId('logout-btn').click()
  await reloaded
  await expect(page.getByTestId('user-dropdown')).not.toBeVisible()
}
