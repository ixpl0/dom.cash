import { describe, it, expect } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
import { setupTestDatabase, createTestMonth, createTestEntry } from './helpers/database'
import { createAuthenticatedUser, makeAuthenticatedRequest } from './helpers/auth'
import type { BudgetExportData, BudgetImportResult } from '~~/shared/types/export-import'

describe('Budget Export/Import API Integration', async () => {
  await setup({
    rootDir: __dirname + '/../..',
  })

  setupTestDatabase()

  describe('GET /api/budget/export', () => {
    it('should export budget successfully', async () => {
      const authContext = await createAuthenticatedUser()
      const testMonth = await createTestMonth(authContext.user.id, 2024, 0)

      await createTestEntry(testMonth.id, {
        kind: 'balance',
        description: 'Savings Account',
        amount: 5000,
        currency: 'USD',
      })

      await createTestEntry(testMonth.id, {
        kind: 'income',
        description: 'Salary',
        amount: 3000,
        currency: 'USD',
        date: '2024-01-15',
      })

      const response = await makeAuthenticatedRequest('/api/budget/export', authContext, {
        method: 'GET',
      })

      const exportData = response as BudgetExportData
      expect(exportData.version).toBe('1.0')
      expect(exportData.user.username).toBe(authContext.user.username)
      expect(exportData.user.mainCurrency).toBe(authContext.user.mainCurrency)
      expect(exportData.months).toHaveLength(1)

      const month = exportData.months[0]!
      expect(month.year).toBe(2024)
      expect(month.month).toBe(0)
      expect(month.entries).toHaveLength(2)

      const balanceEntry = month.entries.find(e => e.kind === 'balance')
      expect(balanceEntry?.description).toBe('Savings Account')
      expect(balanceEntry?.amount).toBe(5000)
      expect(balanceEntry?.currency).toBe('USD')

      const incomeEntry = month.entries.find(e => e.kind === 'income')
      expect(incomeEntry?.description).toBe('Salary')
      expect(incomeEntry?.amount).toBe(3000)
      expect(incomeEntry?.currency).toBe('USD')
      expect(incomeEntry?.date).toBe('2024-01-15')
    })

    it('should return empty export for user without budget data', async () => {
      const authContext = await createAuthenticatedUser()

      const response = await makeAuthenticatedRequest('/api/budget/export', authContext, {
        method: 'GET',
      })

      const exportData = response as BudgetExportData
      expect(exportData.version).toBe('1.0')
      expect(exportData.user.username).toBe(authContext.user.username)
      expect(exportData.months).toHaveLength(0)
    })
  })

  describe('POST /api/budget/import', () => {
    it('should import budget successfully for user without existing data', async () => {
      const authContext = await createAuthenticatedUser()

      const importData: BudgetExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: {
          username: authContext.user.username,
          mainCurrency: authContext.user.mainCurrency,
        },
        months: [
          {
            year: 2024,
            month: 1,
            entries: [
              {
                kind: 'balance',
                description: 'Imported Balance',
                amount: 2000,
                currency: 'USD',
              },
              {
                kind: 'expense',
                description: 'Imported Expense',
                amount: 150,
                currency: 'USD',
                date: '2024-02-10',
              },
            ],
          },
        ],
      }

      const response = await makeAuthenticatedRequest('/api/budget/import', authContext, {
        method: 'POST',
        body: {
          data: importData,
          options: {
            skipExisting: false,
            overwriteExisting: false,
          },
        },
      })

      const result = response as BudgetImportResult
      expect(result.success).toBe(true)
      expect(result.importedMonths).toBe(1)
      expect(result.importedEntries).toBe(2)
      expect(result.skippedMonths).toBe(0)
      expect(result.errors).toHaveLength(0)

      const exportResponse = await makeAuthenticatedRequest('/api/budget/export', authContext, {
        method: 'GET',
      })

      const exportedData = exportResponse as BudgetExportData
      expect(exportedData.months).toHaveLength(1)
      expect(exportedData.months[0]?.entries).toHaveLength(2)
    })

    it('should import multiple months successfully', async () => {
      const authContext = await createAuthenticatedUser()

      const importData: BudgetExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: {
          username: authContext.user.username,
          mainCurrency: authContext.user.mainCurrency,
        },
        months: [
          {
            year: 2024,
            month: 0,
            entries: [
              {
                kind: 'balance',
                description: 'January Balance',
                amount: 1000,
                currency: 'USD',
              },
            ],
          },
          {
            year: 2024,
            month: 1,
            entries: [
              {
                kind: 'balance',
                description: 'February Balance',
                amount: 2000,
                currency: 'USD',
              },
              {
                kind: 'income',
                description: 'Salary',
                amount: 3000,
                currency: 'USD',
                date: '2024-02-15',
              },
            ],
          },
        ],
      }

      const result = await makeAuthenticatedRequest('/api/budget/import', authContext, {
        method: 'POST',
        body: {
          data: importData,
          options: {
            skipExisting: false,
            overwriteExisting: false,
          },
        },
      }) as BudgetImportResult

      expect(result.success).toBe(true)
      expect(result.importedMonths).toBe(2)
      expect(result.importedEntries).toBe(3)
      expect(result.skippedMonths).toBe(0)
      expect(result.errors).toHaveLength(0)

      const exportedData = await makeAuthenticatedRequest('/api/budget/export', authContext, {
        method: 'GET',
      }) as BudgetExportData

      expect(exportedData.months).toHaveLength(2)
      expect(exportedData.months.find(m => m.month === 0)?.entries).toHaveLength(1)
      expect(exportedData.months.find(m => m.month === 1)?.entries).toHaveLength(2)
    })

    it('should skip existing months when skipExisting is true', async () => {
      const authContext = await createAuthenticatedUser()
      const existingMonth = await createTestMonth(authContext.user.id, 2024, 2)

      await createTestEntry(existingMonth.id, {
        kind: 'balance',
        description: 'Original Balance',
        amount: 1000,
        currency: 'USD',
      })

      const importData: BudgetExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: {
          username: authContext.user.username,
          mainCurrency: authContext.user.mainCurrency,
        },
        months: [
          {
            year: 2024,
            month: 2,
            entries: [
              {
                kind: 'balance',
                description: 'Should be skipped',
                amount: 5000,
                currency: 'USD',
              },
            ],
          },
        ],
      }

      const response = await makeAuthenticatedRequest('/api/budget/import', authContext, {
        method: 'POST',
        body: {
          data: importData,
          options: {
            skipExisting: true,
            overwriteExisting: false,
          },
        },
      })

      const result = response as BudgetImportResult
      expect(result.success).toBe(true)
      expect(result.importedMonths).toBe(0)
      expect(result.importedEntries).toBe(0)
      expect(result.skippedMonths).toBe(1)

      const exportResponse = await makeAuthenticatedRequest('/api/budget/export', authContext, {
        method: 'GET',
      })

      const exportedData = exportResponse as BudgetExportData
      const balanceEntry = exportedData.months[0]?.entries.find(e => e.kind === 'balance')
      expect(balanceEntry?.description).toBe('Original Balance')
      expect(balanceEntry?.amount).toBe(1000)
    })

    it('should overwrite existing months when overwriteExisting is true', async () => {
      const authContext = await createAuthenticatedUser()
      const existingMonth = await createTestMonth(authContext.user.id, 2024, 3)

      await createTestEntry(existingMonth.id, {
        kind: 'balance',
        description: 'Original Balance',
        amount: 1000,
        currency: 'USD',
      })

      const importData: BudgetExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: {
          username: authContext.user.username,
          mainCurrency: authContext.user.mainCurrency,
        },
        months: [
          {
            year: 2024,
            month: 3,
            entries: [
              {
                kind: 'balance',
                description: 'New Balance',
                amount: 3000,
                currency: 'USD',
              },
              {
                kind: 'income',
                description: 'New Income',
                amount: 1500,
                currency: 'USD',
              },
            ],
          },
        ],
      }

      const response = await makeAuthenticatedRequest('/api/budget/import', authContext, {
        method: 'POST',
        body: {
          data: importData,
          options: {
            skipExisting: false,
            overwriteExisting: true,
          },
        },
      })

      const result = response as BudgetImportResult
      expect(result.success).toBe(true)
      expect(result.importedMonths).toBe(0)
      expect(result.importedEntries).toBe(2)
      expect(result.skippedMonths).toBe(0)

      const exportResponse = await makeAuthenticatedRequest('/api/budget/export', authContext, {
        method: 'GET',
      })

      const exportedData = exportResponse as BudgetExportData
      expect(exportedData.months[0]?.entries).toHaveLength(2)

      const balanceEntry = exportedData.months[0]?.entries.find(e => e.kind === 'balance')
      expect(balanceEntry?.description).toBe('New Balance')
      expect(balanceEntry?.amount).toBe(3000)
    })

    it('should reject invalid import data', async () => {
      const authContext = await createAuthenticatedUser()

      const invalidImportData = {
        version: '2.0', // Invalid version
        user: {
          username: authContext.user.username,
          mainCurrency: authContext.user.mainCurrency,
        },
        months: [],
      }

      await expect(
        makeAuthenticatedRequest('/api/budget/import', authContext, {
          method: 'POST',
          body: {
            data: invalidImportData,
            options: {
              skipExisting: false,
              overwriteExisting: false,
            },
          },
        }),
      ).rejects.toThrow()
    })
  })
})
