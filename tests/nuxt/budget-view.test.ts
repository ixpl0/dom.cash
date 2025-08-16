import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { setupTestDatabase, createTestMonth, createTestEntry, createTestShare } from './helpers/database'
import { createAuthenticatedUser, makeAuthenticatedRequest } from './helpers/auth'

describe('Budget View API Integration', async () => {
  await setup({
    rootDir: __dirname + '/../..',
  })

  setupTestDatabase()

  describe('GET /api/budget/[username]', () => {
    it('should return own budget data', async () => {
      const authContext = await createAuthenticatedUser({ username: 'testowner', password: 'pass1' })
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)

      await createTestEntry(testMonth.id, {
        kind: 'income',
        description: 'Salary',
        amount: 5000,
        currency: 'USD',
        date: '2024-01-15',
      })

      const response = await makeAuthenticatedRequest(`/api/budget/${authContext.user.username}`, authContext) as any

      expect(response).toBeInstanceOf(Array)
      expect(response).toHaveLength(1)
      expect(response[0]).toMatchObject({
        id: testMonth.id,
        year: 2024,
        month: 0,
        income: 5000,
      })
    })

    it('should return shared budget data with read access', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'budgetowner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'budgetviewer', password: 'pass2' })

      const testMonth = await createTestMonth(authContext1.user.id, 2024, 0)
      await createTestEntry(testMonth.id, {
        kind: 'expense',
        description: 'Groceries',
        amount: 200,
        currency: 'USD',
        date: '2024-01-10',
      })

      await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      const response = await makeAuthenticatedRequest(`/api/budget/${authContext1.user.username}`, authContext2) as any

      expect(response).toBeInstanceOf(Array)
      expect(response).toHaveLength(1)
      expect(response[0]).toMatchObject({
        id: testMonth.id,
        year: 2024,
        month: 0,
        balanceChange: -200,
      })
      expect(response[0].expenseEntries).toHaveLength(1)
      expect(response[0].expenseEntries[0]).toMatchObject({
        description: 'Groceries',
        amount: 200,
      })
    })

    it('should return shared budget data with write access', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'budgetowner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'budgeteditor', password: 'pass2' })

      const testMonth = await createTestMonth(authContext1.user.id, 2024, 1)
      await createTestEntry(testMonth.id, {
        kind: 'balance',
        description: 'Opening Balance',
        amount: 10000,
        currency: 'USD',
      })

      await createTestShare(authContext1.user.id, authContext2.user.id, 'write')

      const response = await makeAuthenticatedRequest(`/api/budget/${authContext1.user.username}`, authContext2) as any

      expect(response).toBeInstanceOf(Array)
      expect(response).toHaveLength(1)
      expect(response[0]).toMatchObject({
        year: 2024,
        month: 1,
      })
      expect(response[0].balanceSources).toHaveLength(1)
      expect(response[0].balanceSources[0]).toMatchObject({
        description: 'Opening Balance',
        amount: 10000,
      })
    })

    it('should reject access to non-shared budget', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'privateowner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'outsider', password: 'pass2' })

      await createTestMonth(authContext1.user.id, 2024, 0)

      await expect(makeAuthenticatedRequest(`/api/budget/${authContext1.user.username}`, authContext2))
        .rejects.toThrow()
    })

    it('should reject access to non-existent user', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/nonexistentuser', authContext))
        .rejects.toThrow()
    })

    it('should return empty array for user without months', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'emptyowner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'viewer', password: 'pass2' })

      await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      const response = await makeAuthenticatedRequest(`/api/budget/${authContext1.user.username}`, authContext2) as any

      expect(response).toBeInstanceOf(Array)
      expect(response).toHaveLength(0)
    })

    it('should reject unauthenticated requests', async () => {
      await expect($fetch('/api/budget/someuser')).rejects.toThrow()
    })
  })
})
