import { $fetch } from '@nuxt/test-utils/e2e'
import { createHash } from 'node:crypto'
// TODO: Update tests to use proper database context
// import { db } from '~~/server/db'
import { user, session } from '~~/server/db/schema'
import { hashPassword } from '~~/server/utils/auth'

// Temporary test database instance - needs to be replaced with proper test setup
const db: any = null

export interface TestAuthContext {
  user: {
    id: string
    username: string
    password: string
    mainCurrency: string
  }
  token: string
}

export const createAuthenticatedUser = async (userData: {
  username?: string
  password?: string
} = {}): Promise<TestAuthContext> => {
  const username = userData.username || 'testuser'
  const password = userData.password || 'testpassword123'

  const userId = crypto.randomUUID()
  const passwordHash = await hashPassword(password)

  await db.insert(user).values({
    id: userId,
    username,
    passwordHash,
    mainCurrency: 'USD',
    createdAt: new Date(),
  })

  const token = crypto.randomUUID() + crypto.randomUUID()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await db.insert(session).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    createdAt: now,
    expiresAt,
  })

  return {
    user: {
      id: userId,
      username,
      password,
      mainCurrency: 'USD',
    },
    token,
  }
}

export const makeAuthenticatedRequest = async <T>(
  url: string,
  authContext: TestAuthContext,
  options: any = {},
): Promise<T> => {
  return await $fetch<T>(url, {
    ...options,
    headers: {
      ...options.headers,
      cookie: `auth-token=${authContext.token}`,
    },
  })
}

export const logout = async (authContext: TestAuthContext) => {
  return await $fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      cookie: `auth-token=${authContext.token}`,
    },
  })
}
