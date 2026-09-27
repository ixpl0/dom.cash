import type { APIRequestContext } from '@playwright/test'
import { BASE_URL } from '../constants'

const SKIPPED_STATUSES = [400, 401]

export const cleanupUserData = async (request: APIRequestContext) => {
  const response = await request.delete(`${BASE_URL}/api/test/cleanup-user-data`)

  if (!response.ok() && !SKIPPED_STATUSES.includes(response.status())) {
    throw new Error(`User data cleanup failed with status ${response.status()}: ${await response.text()}`)
  }

  return response
}
