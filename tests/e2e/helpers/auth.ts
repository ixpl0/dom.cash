import type { Page, APIRequestContext } from '@playwright/test'

export const TEST_USER = {
  username: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  mainCurrency: 'USD',
}

export const authenticateViaAPI = async (request: APIRequestContext) => {
  const response = await request.post('/api/auth', {
    data: {
      username: TEST_USER.username,
      password: TEST_USER.password,
      mainCurrency: TEST_USER.mainCurrency,
    },
  })

  if (!response.ok()) {
    const body = await response.text()
    throw new Error(`Authentication failed: ${response.status()} - ${body}`)
  }

  return response
}

export const loginViaUI = async (page: Page) => {
  await page.goto('/auth')
  await page.getByTestId('username-input').fill(TEST_USER.username)
  await page.getByTestId('password-input').fill(TEST_USER.password)
  await page.getByTestId('submit-btn').click()
  await page.waitForURL('/budget')
}

export const ensureAuthenticated = async (page: Page) => {
  const response = await page.request.get('/api/auth/me')
  return response.ok()
}
