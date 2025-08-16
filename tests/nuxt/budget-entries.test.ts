import { describe, it, expect } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
import { setupTestDatabase, createTestMonth, createTestEntry, createTestShare } from './helpers/database'
import { createAuthenticatedUser, makeAuthenticatedRequest } from './helpers/auth'

describe('Budget Entries API Integration', async () => {
  await setup({
    rootDir: __dirname + '/../..',
  })

  setupTestDatabase()

  describe('POST /api/budget/entries', () => {
    it('should create new entry', async () => {
      const authContext = await createAuthenticatedUser()
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)

      const entryData = {
        monthId: testMonth.id,
        kind: 'income' as const,
        description: 'Freelance Work',
        amount: 2500,
        currency: 'USD',
        date: '2024-01-15',
      }

      const response = await makeAuthenticatedRequest('/api/budget/entries', authContext, {
        method: 'POST',
        body: entryData,
      })

      expect(response).toMatchObject({
        id: expect.any(String),
        monthId: testMonth.id,
        kind: 'income',
        description: 'Freelance Work',
        amount: 2500,
        currency: 'USD',
        date: '2024-01-15',
      })
    })

    it('should create balance entry without date', async () => {
      const authContext = await createAuthenticatedUser()
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)

      const entryData = {
        monthId: testMonth.id,
        kind: 'balance' as const,
        description: 'Opening Balance',
        amount: 1000,
        currency: 'USD',
      }

      const response = await makeAuthenticatedRequest('/api/budget/entries', authContext, {
        method: 'POST',
        body: entryData,
      })

      expect(response).toMatchObject({
        ...entryData,
        id: expect.any(String),
        date: null,
      })
    })

    it('should reject entry for non-existent month', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/entries', authContext, {
        method: 'POST',
        body: {
          monthId: 'non-existent-month',
          kind: 'income',
          description: 'Test',
          amount: 100,
          currency: 'USD',
        },
      })).rejects.toThrow()
    })

    it('should reject entry for month user does not own', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'user1', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'user2', password: 'pass2' })
      const testMonth = await createTestMonth(authContext1.user.id, 2024, 0)

      await expect(makeAuthenticatedRequest('/api/budget/entries', authContext2, {
        method: 'POST',
        body: {
          monthId: testMonth.id,
          kind: 'income',
          description: 'Test',
          amount: 100,
          currency: 'USD',
        },
      })).rejects.toThrow()
    })

    it('should allow entry for shared month with write access', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'writer', password: 'pass2' })
      const testMonth = await createTestMonth(authContext1.user.id, 2024, 0)

      await createTestShare(authContext1.user.id, authContext2.user.id, 'write')

      const response = await makeAuthenticatedRequest('/api/budget/entries', authContext2, {
        method: 'POST',
        body: {
          monthId: testMonth.id,
          kind: 'income',
          description: 'Shared Entry',
          amount: 500,
          currency: 'USD',
        },
      })

      expect(response).toMatchObject({
        monthId: testMonth.id,
        description: 'Shared Entry',
        amount: 500,
      })
    })

    it('should validate required fields', async () => {
      const authContext = await createAuthenticatedUser()
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)

      await expect(makeAuthenticatedRequest('/api/budget/entries', authContext, {
        method: 'POST',
        body: {
          monthId: testMonth.id,
          kind: 'income',
          amount: 100,
          currency: 'USD',
        },
      })).rejects.toThrow()

      await expect(makeAuthenticatedRequest('/api/budget/entries', authContext, {
        method: 'POST',
        body: {
          monthId: testMonth.id,
          description: 'Test',
          amount: 100,
          currency: 'USD',
        },
      })).rejects.toThrow()
    })
  })

  describe('PUT /api/budget/entries/[id]', () => {
    it('should update entry', async () => {
      const authContext = await createAuthenticatedUser()
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)
      const testEntry = await createTestEntry(testMonth.id, {
        kind: 'income',
        description: 'Original Description',
        amount: 1000,
        currency: 'USD',
        date: '2024-01-01',
      })

      const updateData = {
        description: 'Updated Description',
        amount: 1500,
        currency: 'EUR',
        date: '2024-01-15',
      }

      const response = await makeAuthenticatedRequest(`/api/budget/entries/${testEntry.id}`, authContext, {
        method: 'PUT',
        body: updateData,
      })

      expect(response).toMatchObject({
        id: testEntry.id,
        ...updateData,
      })
    })

    it('should reject update for non-existent entry', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/entries/non-existent', authContext, {
        method: 'PUT',
        body: {
          description: 'Test',
          amount: 100,
          currency: 'USD',
        },
      })).rejects.toThrow()
    })

    it('should reject update without write permission', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'reader', password: 'pass2' })
      const testMonth = await createTestMonth(authContext1.user.id, 2024, 0)
      const testEntry = await createTestEntry(testMonth.id, {
        kind: 'income',
        description: 'Test',
        amount: 1000,
        currency: 'USD',
      })

      await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      await expect(makeAuthenticatedRequest(`/api/budget/entries/${testEntry.id}`, authContext2, {
        method: 'PUT',
        body: {
          description: 'Updated',
          amount: 2000,
          currency: 'USD',
        },
      })).rejects.toThrow()
    })
  })

  describe('DELETE /api/budget/entries/[id]', () => {
    it('should delete entry', async () => {
      const authContext = await createAuthenticatedUser()
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)
      const testEntry = await createTestEntry(testMonth.id, {
        kind: 'expense',
        description: 'To Delete',
        amount: 100,
        currency: 'USD',
      })

      const response = await makeAuthenticatedRequest(`/api/budget/entries/${testEntry.id}`, authContext, {
        method: 'DELETE',
      })

      expect(response).toMatchObject({
        success: true,
      })

      await expect(makeAuthenticatedRequest(`/api/budget/entries/${testEntry.id}`, authContext, {
        method: 'PUT',
        body: {
          description: 'Should fail',
          amount: 200,
          currency: 'USD',
        },
      })).rejects.toThrow()
    })

    it('should reject delete for non-existent entry', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/entries/non-existent', authContext, {
        method: 'DELETE',
      })).rejects.toThrow()
    })

    it('should reject delete without write permission', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'reader', password: 'pass2' })
      const testMonth = await createTestMonth(authContext1.user.id, 2024, 0)
      const testEntry = await createTestEntry(testMonth.id, {
        kind: 'expense',
        description: 'Protected',
        amount: 100,
        currency: 'USD',
      })

      await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      await expect(makeAuthenticatedRequest(`/api/budget/entries/${testEntry.id}`, authContext2, {
        method: 'DELETE',
      })).rejects.toThrow()
    })
  })
})
