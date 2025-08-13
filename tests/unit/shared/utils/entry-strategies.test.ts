import { describe, it, expect } from 'vitest'

import {
  entryStrategies,
  getEntryConfig,
  updateMonthWithNewEntry,
  updateMonthWithUpdatedEntry,
  updateMonthWithDeletedEntry,
  findEntryKindByEntryId,
} from '~~/shared/utils/entry-strategies'
import type { MonthData, BalanceSourceData, IncomeEntryData, ExpenseEntryData } from '~~/shared/types/budget'
import type { EntryKind } from '~~/server/db/schema'

const createMockMonth = (): MonthData => ({
  id: 'month-1',
  year: 2025,
  month: 1,
  userId: 'user-1',
  budget: 5000,
  entries: [],
  balanceSources: [
    { id: 'balance-1', description: 'Savings', amount: 1000, currency: 'USD' },
  ],
  incomeEntries: [
    { id: 'income-1', description: 'Salary', amount: 3000, currency: 'USD', date: '2025-02-01' },
  ],
  expenseEntries: [
    { id: 'expense-1', description: 'Rent', amount: 1500, currency: 'USD', date: '2025-02-01' },
  ],
})

describe('shared/utils/entry-strategies', () => {
  describe('entryStrategies', () => {
    it('should have correct balance strategy configuration', () => {
      const balanceStrategy = entryStrategies.balance

      expect(balanceStrategy).toEqual({
        title: 'Источники баланса',
        emptyMessage: 'Пока нет источников баланса',
        arrayKey: 'balanceSources',
        createEntry: expect.any(Function),
      })
    })

    it('should have correct income strategy configuration', () => {
      const incomeStrategy = entryStrategies.income

      expect(incomeStrategy).toEqual({
        title: 'Доходы',
        emptyMessage: 'Пока нет доходов',
        arrayKey: 'incomeEntries',
        createEntry: expect.any(Function),
      })
    })

    it('should have correct expense strategy configuration', () => {
      const expenseStrategy = entryStrategies.expense

      expect(expenseStrategy).toEqual({
        title: 'Крупные расходы',
        emptyMessage: 'Пока нет крупных расходов',
        arrayKey: 'expenseEntries',
        createEntry: expect.any(Function),
      })
    })

    it('should create balance entry correctly', () => {
      const data = {
        id: 'test-id',
        description: 'Test balance',
        amount: 500,
        currency: 'USD',
        date: '2025-02-01',
      }

      const result = entryStrategies.balance.createEntry(data)

      expect(result).toEqual({
        id: 'test-id',
        description: 'Test balance',
        amount: 500,
        currency: 'USD',
      })
    })

    it('should create income entry correctly', () => {
      const data = {
        id: 'test-id',
        description: 'Test income',
        amount: 500,
        currency: 'USD',
        date: '2025-02-01',
      }

      const result = entryStrategies.income.createEntry(data)

      expect(result).toEqual({
        id: 'test-id',
        description: 'Test income',
        amount: 500,
        currency: 'USD',
        date: '2025-02-01',
      })
    })

    it('should create income entry with null date when date not provided', () => {
      const data = {
        id: 'test-id',
        description: 'Test income',
        amount: 500,
        currency: 'USD',
      }

      const result = entryStrategies.income.createEntry(data)

      expect(result).toEqual({
        id: 'test-id',
        description: 'Test income',
        amount: 500,
        currency: 'USD',
        date: null,
      })
    })

    it('should create expense entry correctly', () => {
      const data = {
        id: 'test-id',
        description: 'Test expense',
        amount: 500,
        currency: 'USD',
        date: '2025-02-01',
      }

      const result = entryStrategies.expense.createEntry(data)

      expect(result).toEqual({
        id: 'test-id',
        description: 'Test expense',
        amount: 500,
        currency: 'USD',
        date: '2025-02-01',
      })
    })
  })

  describe('getEntryConfig', () => {
    it('should return balance config for balance kind', () => {
      const config = getEntryConfig('balance')

      expect(config).toBe(entryStrategies.balance)
    })

    it('should return income config for income kind', () => {
      const config = getEntryConfig('income')

      expect(config).toBe(entryStrategies.income)
    })

    it('should return expense config for expense kind', () => {
      const config = getEntryConfig('expense')

      expect(config).toBe(entryStrategies.expense)
    })
  })

  describe('updateMonthWithNewEntry', () => {
    it('should add new balance entry to month', () => {
      const month = createMockMonth()
      const newEntry: BalanceSourceData = {
        id: 'balance-2',
        description: 'Emergency fund',
        amount: 2000,
        currency: 'USD',
      }

      const result = updateMonthWithNewEntry(month, 'balance', newEntry)

      expect(result.balanceSources).toHaveLength(2)
      expect(result.balanceSources[1]).toEqual(newEntry)
      expect(result.incomeEntries).toEqual(month.incomeEntries)
      expect(result.expenseEntries).toEqual(month.expenseEntries)
    })

    it('should add new income entry to month', () => {
      const month = createMockMonth()
      const newEntry: IncomeEntryData = {
        id: 'income-2',
        description: 'Bonus',
        amount: 1000,
        currency: 'USD',
        date: '2025-02-15',
      }

      const result = updateMonthWithNewEntry(month, 'income', newEntry)

      expect(result.incomeEntries).toHaveLength(2)
      expect(result.incomeEntries[1]).toEqual(newEntry)
      expect(result.balanceSources).toEqual(month.balanceSources)
      expect(result.expenseEntries).toEqual(month.expenseEntries)
    })

    it('should add new expense entry to month', () => {
      const month = createMockMonth()
      const newEntry: ExpenseEntryData = {
        id: 'expense-2',
        description: 'Groceries',
        amount: 400,
        currency: 'USD',
        date: '2025-02-10',
      }

      const result = updateMonthWithNewEntry(month, 'expense', newEntry)

      expect(result.expenseEntries).toHaveLength(2)
      expect(result.expenseEntries[1]).toEqual(newEntry)
      expect(result.balanceSources).toEqual(month.balanceSources)
      expect(result.incomeEntries).toEqual(month.incomeEntries)
    })
  })

  describe('updateMonthWithUpdatedEntry', () => {
    it('should update existing balance entry', () => {
      const month = createMockMonth()
      const updateData = {
        description: 'Updated savings',
        amount: 1500,
      }

      const result = updateMonthWithUpdatedEntry(month, 'balance', 'balance-1', updateData)

      expect(result.balanceSources[0]).toEqual({
        id: 'balance-1',
        description: 'Updated savings',
        amount: 1500,
        currency: 'USD',
      })
    })

    it('should update existing income entry', () => {
      const month = createMockMonth()
      const updateData = {
        description: 'Updated salary',
        amount: 3500,
        date: '2025-02-02',
      }

      const result = updateMonthWithUpdatedEntry(month, 'income', 'income-1', updateData)

      expect(result.incomeEntries[0]).toEqual({
        id: 'income-1',
        description: 'Updated salary',
        amount: 3500,
        currency: 'USD',
        date: '2025-02-02',
      })
    })

    it('should update existing expense entry', () => {
      const month = createMockMonth()
      const updateData = {
        currency: 'EUR',
        amount: 1200,
      }

      const result = updateMonthWithUpdatedEntry(month, 'expense', 'expense-1', updateData)

      expect(result.expenseEntries[0]).toEqual({
        id: 'expense-1',
        description: 'Rent',
        amount: 1200,
        currency: 'EUR',
        date: '2025-02-01',
      })
    })

    it('should return unchanged month when entry not found', () => {
      const month = createMockMonth()
      const updateData = { description: 'New description' }

      const result = updateMonthWithUpdatedEntry(month, 'balance', 'non-existent', updateData)

      expect(result).toEqual(month)
    })

    it('should handle undefined date correctly for entries with date', () => {
      const month = createMockMonth()
      const updateData = {
        description: 'Updated income',
        date: undefined,
      }

      const result = updateMonthWithUpdatedEntry(month, 'income', 'income-1', updateData)

      expect(result.incomeEntries[0]?.date).toBe('2025-02-01')
    })

    it('should handle null date correctly for entries with date', () => {
      const month = createMockMonth()
      const updateData = {
        description: 'Updated income',
        date: null,
      }

      const result = updateMonthWithUpdatedEntry(month, 'income', 'income-1', updateData)

      expect(result.incomeEntries[0]?.date).toBe(null)
    })
  })

  describe('updateMonthWithDeletedEntry', () => {
    it('should remove balance entry from month', () => {
      const month = createMockMonth()

      const result = updateMonthWithDeletedEntry(month, 'balance', 'balance-1')

      expect(result.balanceSources).toHaveLength(0)
      expect(result.incomeEntries).toEqual(month.incomeEntries)
      expect(result.expenseEntries).toEqual(month.expenseEntries)
    })

    it('should remove income entry from month', () => {
      const month = createMockMonth()

      const result = updateMonthWithDeletedEntry(month, 'income', 'income-1')

      expect(result.incomeEntries).toHaveLength(0)
      expect(result.balanceSources).toEqual(month.balanceSources)
      expect(result.expenseEntries).toEqual(month.expenseEntries)
    })

    it('should remove expense entry from month', () => {
      const month = createMockMonth()

      const result = updateMonthWithDeletedEntry(month, 'expense', 'expense-1')

      expect(result.expenseEntries).toHaveLength(0)
      expect(result.balanceSources).toEqual(month.balanceSources)
      expect(result.incomeEntries).toEqual(month.incomeEntries)
    })

    it('should return unchanged month when entry not found', () => {
      const month = createMockMonth()

      const result = updateMonthWithDeletedEntry(month, 'balance', 'non-existent')

      expect(result).toEqual(month)
    })
  })

  describe('findEntryKindByEntryId', () => {
    it('should find balance entry kind', () => {
      const month = createMockMonth()

      const result = findEntryKindByEntryId(month, 'balance-1')

      expect(result).toBe('balance')
    })

    it('should find income entry kind', () => {
      const month = createMockMonth()

      const result = findEntryKindByEntryId(month, 'income-1')

      expect(result).toBe('income')
    })

    it('should find expense entry kind', () => {
      const month = createMockMonth()

      const result = findEntryKindByEntryId(month, 'expense-1')

      expect(result).toBe('expense')
    })

    it('should return null when entry not found', () => {
      const month = createMockMonth()

      const result = findEntryKindByEntryId(month, 'non-existent')

      expect(result).toBe(null)
    })

    it('should handle empty month data', () => {
      const emptyMonth: MonthData = {
        id: 'month-1',
        year: 2025,
        month: 1,
        userId: 'user-1',
        budget: 5000,
        entries: [],
        balanceSources: [],
        incomeEntries: [],
        expenseEntries: [],
      }

      const result = findEntryKindByEntryId(emptyMonth, 'any-id')

      expect(result).toBe(null)
    })
  })
})
