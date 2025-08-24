import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { setupTestDatabase, createTestMonth, createTestEntry } from './helpers/database'
import { createAuthenticatedUser, makeAuthenticatedRequest } from './helpers/auth'

describe('Budget Months API Integration', async () => {
  await setup({
    rootDir: __dirname + '/../..',
  })

  setupTestDatabase()

  describe('GET /api/budget/months', () => {
    it('should return user months with entries', async () => {
      const authContext = await createAuthenticatedUser()
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)

      await createTestEntry(testMonth.id, {
        kind: 'balance',
        description: 'Opening Balance',
        amount: 1000,
        currency: 'USD',
      })

      await createTestEntry(testMonth.id, {
        kind: 'income',
        description: 'Salary',
        amount: 5000,
        currency: 'USD',
        date: '2024-01-15',
      })

      await createTestEntry(testMonth.id, {
        kind: 'expense',
        description: 'Rent',
        amount: 1500,
        currency: 'USD',
        date: '2024-01-01',
      })

      const response = await makeAuthenticatedRequest('/api/budget/months', authContext) as any

      expect(response).toBeInstanceOf(Array)
      expect(response).toHaveLength(1)

      const month = response[0]
      expect(month).toMatchObject({
        id: testMonth.id,
        year: 2024,
        month: 0,
        userMonthId: testMonth.id,
        income: 5000,
      })

      expect(month.balanceSources).toHaveLength(1)
      expect(month.balanceSources[0]).toMatchObject({
        description: 'Opening Balance',
        amount: 1000,
        currency: 'USD',
      })

      expect(month.incomeEntries).toHaveLength(1)
      expect(month.incomeEntries[0]).toMatchObject({
        description: 'Salary',
        amount: 5000,
        currency: 'USD',
        date: '2024-01-15',
      })

      expect(month.expenseEntries).toHaveLength(1)
      expect(month.expenseEntries[0]).toMatchObject({
        description: 'Rent',
        amount: 1500,
        currency: 'USD',
        date: '2024-01-01',
      })
    })

    it('should return empty array for user without months', async () => {
      const authContext = await createAuthenticatedUser()

      const response = await makeAuthenticatedRequest('/api/budget/months', authContext)

      expect(response).toBeInstanceOf(Array)
      expect(response).toHaveLength(0)
    })

    it('should reject unauthenticated requests', async () => {
      await expect($fetch('/api/budget/months')).rejects.toThrow()
    })
  })

  describe('POST /api/budget/months', () => {
    it('should create new month', async () => {
      const authContext = await createAuthenticatedUser()

      const response = await makeAuthenticatedRequest('/api/budget/months', authContext, {
        method: 'POST',
        body: {
          year: 2024,
          month: 0,
        },
      })

      expect(response).toMatchObject({
        id: expect.any(String),
        userId: authContext.user.id,
        year: 2024,
        month: 0,
      })
    })

    it('should copy balance entries when copyFromMonthId provided', async () => {
      const authContext = await createAuthenticatedUser()
      const sourceMonth = await createTestMonth(authContext.user.id, 2023, 11)

      await createTestEntry(sourceMonth.id, {
        kind: 'balance',
        description: 'Savings Account',
        amount: 5000,
        currency: 'USD',
      })

      await createTestEntry(sourceMonth.id, {
        kind: 'income',
        description: 'Should not be copied',
        amount: 1000,
        currency: 'USD',
        date: '2023-12-15',
      })

      const response = await makeAuthenticatedRequest('/api/budget/months', authContext, {
        method: 'POST',
        body: {
          year: 2024,
          month: 0,
          copyFromMonthId: sourceMonth.id,
        },
      })

      expect(response).toMatchObject({
        year: 2024,
        month: 0,
        userId: authContext.user.id,
      })

      const monthsResponse = await makeAuthenticatedRequest('/api/budget/months', authContext) as any
      const newMonth = monthsResponse.find((m: any) => m.year === 2024 && m.month === 0)

      expect(newMonth.balanceSources).toHaveLength(1)
      expect(newMonth.balanceSources[0]).toMatchObject({
        description: 'Savings Account',
        amount: 5000,
        currency: 'USD',
      })
      expect(newMonth.incomeEntries).toHaveLength(0)
    })

    it('should prevent creating duplicate month', async () => {
      const authContext = await createAuthenticatedUser()
      await createTestMonth(authContext.user.id, 2024, 0)

      await expect(makeAuthenticatedRequest('/api/budget/months', authContext, {
        method: 'POST',
        body: {
          year: 2024,
          month: 0,
        },
      })).rejects.toThrow()
    })

    it('should validate required fields', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/months', authContext, {
        method: 'POST',
        body: {
          month: 0,
        },
      })).rejects.toThrow()

      await expect(makeAuthenticatedRequest('/api/budget/months', authContext, {
        method: 'POST',
        body: {
          year: 2024,
        },
      })).rejects.toThrow()
    })

    it('should reject unauthenticated requests', async () => {
      await expect($fetch('/api/budget/months', {
        method: 'POST',
        body: {
          year: 2024,
          month: 0,
        },
      })).rejects.toThrow()
    })
  })

  describe('DELETE /api/budget/months/[id]', () => {
    it('should delete month and its entries', async () => {
      const authContext = await createAuthenticatedUser()
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)

      await createTestEntry(testMonth.id, {
        kind: 'income',
        description: 'Test Income',
        amount: 1000,
        currency: 'USD',
        date: '2024-01-15',
      })

      const response = await makeAuthenticatedRequest(`/api/budget/months/${testMonth.id}`, authContext, {
        method: 'DELETE',
      })

      expect(response).toMatchObject({ success: true })

      const monthsResponse = await makeAuthenticatedRequest('/api/budget/months', authContext) as any
      expect(monthsResponse).toHaveLength(0)
    })

    it('should reject deletion of non-existent month', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/months/nonexistent-id', authContext, {
        method: 'DELETE',
      })).rejects.toThrow()
    })

    it('should reject deletion by non-owner', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner' })
      const authContext2 = await createAuthenticatedUser({ username: 'other' })
      const testMonth = await createTestMonth(authContext1.user.id, 2024, 0)

      await expect(makeAuthenticatedRequest(`/api/budget/months/${testMonth.id}`, authContext2, {
        method: 'DELETE',
      })).rejects.toThrow()
    })

    it('should reject unauthenticated deletion', async () => {
      const authContext = await createAuthenticatedUser()
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)

      await expect($fetch(`/api/budget/months/${testMonth.id}`, {
        method: 'DELETE',
      })).rejects.toThrow()
    })
  })
})
