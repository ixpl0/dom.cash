import type { APIRequestContext } from '@playwright/test'

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

export const cleanupUserData = async (request: APIRequestContext) => {
  const response = await request.delete('/api/test/cleanup-user-data')

  if (!response.ok()) {
    const body = await response.text()
    throw new Error(`User data cleanup failed: ${response.status()} - ${body}`)
  }

  return response
}
