import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { BASE_URL, DEV_VERIFICATION_CODE } from '../constants'
import { waitForHydration } from './wait-for-hydration'

const REGISTRATION_NAVIGATION_TIMEOUT = 60000

export const registerUser = async (page: Page, email: string, password: string): Promise<void> => {
  await page.goto('/auth', { timeout: REGISTRATION_NAVIGATION_TIMEOUT })
  await waitForHydration(page)
  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('register-btn').click()
  await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
  await page.getByTestId('verify-code-btn').click()
  await page.waitForURL('/', { timeout: REGISTRATION_NAVIGATION_TIMEOUT })
  await waitForHydration(page)
}

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
