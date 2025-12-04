import type { APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787'

export const cleanupUserData = async (request: APIRequestContext) => {
  try {
    const response = await request.delete(`${BASE_URL}/api/test/cleanup-user-data`)

    if (response.status() === 401 || response.status() === 400) {
      return response
    }

    if (!response.ok()) {
      const body = await response.text()
      console.warn(`User data cleanup warning: ${response.status()} - ${body}`)
    }

    return response
  }
  catch {
    return null
  }
}
