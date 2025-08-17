import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { setupTestDatabase, createTestShare } from './helpers/database'
import { createAuthenticatedUser, makeAuthenticatedRequest } from './helpers/auth'

describe('User Currency API Integration', async () => {
  await setup({
    rootDir: __dirname + '/../..',
  })

  setupTestDatabase()

  describe('PUT /api/user/currency', () => {
    it('should update own currency', async () => {
      const authContext = await createAuthenticatedUser({ username: 'testuser' })

      const response = await makeAuthenticatedRequest('/api/user/currency', authContext, {
        method: 'PUT',
        body: {
          currency: 'EUR',
        },
      })

      expect(response).toMatchObject({ success: true })

      const meResponse = await makeAuthenticatedRequest('/api/auth/me', authContext) as any
      expect(meResponse.mainCurrency).toBe('EUR')
    })

    it('should update shared user currency with write access', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'budgetowner' })
      const authContext2 = await createAuthenticatedUser({ username: 'budgeteditor' })

      await createTestShare(authContext1.user.id, authContext2.user.id, 'write')

      const response = await makeAuthenticatedRequest('/api/user/currency', authContext2, {
        method: 'PUT',
        body: {
          currency: 'GBP',
          targetUsername: authContext1.user.username,
        },
      })

      expect(response).toMatchObject({ success: true })

      const meResponse = await makeAuthenticatedRequest('/api/auth/me', authContext1) as any
      expect(meResponse.mainCurrency).toBe('GBP')
    })

    it('should reject currency update without write access', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'budgetowner' })
      const authContext2 = await createAuthenticatedUser({ username: 'budgetviewer' })

      await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      await expect(makeAuthenticatedRequest('/api/user/currency', authContext2, {
        method: 'PUT',
        body: {
          currency: 'EUR',
          targetUsername: authContext1.user.username,
        },
      })).rejects.toThrow()
    })

    it('should reject currency update for non-shared user', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'budgetowner' })
      const authContext2 = await createAuthenticatedUser({ username: 'budgetviewer' })

      await expect(makeAuthenticatedRequest('/api/user/currency', authContext2, {
        method: 'PUT',
        body: {
          currency: 'EUR',
          targetUsername: authContext1.user.username,
        },
      })).rejects.toThrow()
    })

    it('should reject invalid currency format', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/user/currency', authContext, {
        method: 'PUT',
        body: {
          currency: 'usd', // lowercase
        },
      })).rejects.toThrow()

      await expect(makeAuthenticatedRequest('/api/user/currency', authContext, {
        method: 'PUT',
        body: {
          currency: 'USDD', // too long
        },
      })).rejects.toThrow()

      await expect(makeAuthenticatedRequest('/api/user/currency', authContext, {
        method: 'PUT',
        body: {
          currency: 'US', // too short
        },
      })).rejects.toThrow()
    })

    it('should reject update for non-existent target user', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/user/currency', authContext, {
        method: 'PUT',
        body: {
          currency: 'EUR',
          targetUsername: 'nonexistent',
        },
      })).rejects.toThrow()
    })

    it('should reject unauthenticated requests', async () => {
      await expect($fetch('/api/user/currency', {
        method: 'PUT',
        body: {
          currency: 'EUR',
        },
      })).rejects.toThrow()
    })
  })
})
