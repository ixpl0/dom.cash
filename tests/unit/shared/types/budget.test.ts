import { describe, it, expect } from 'vitest'
import type {
  MonthData,
  BalanceSourceData,
  IncomeEntryData,
  ExpenseEntryData,
  BudgetEntry,
  UserSettings,
} from '~~/shared/types/budget'

describe('Budget Types', () => {
  describe('MonthData', () => {
    it('should have correct structure', () => {
      const monthData: MonthData = {
        id: 'month-1',
        year: 2024,
        month: 0,
        userMonthId: 'month-1',
        balanceSources: [],
        incomeEntries: [],
        expenseEntries: [],
        balanceChange: 0,
        pocketExpenses: 0,
        income: 0,
      }

      expect(monthData.id).toBe('month-1')
      expect(monthData.year).toBe(2024)
      expect(monthData.month).toBe(0)
      expect(monthData.balanceSources).toEqual([])
      expect(monthData.incomeEntries).toEqual([])
      expect(monthData.expenseEntries).toEqual([])
    })

    it('should support optional exchange rates', () => {
      const monthData: MonthData = {
        id: 'month-1',
        year: 2024,
        month: 0,
        userMonthId: 'month-1',
        balanceSources: [],
        incomeEntries: [],
        expenseEntries: [],
        balanceChange: 0,
        pocketExpenses: 0,
        income: 0,
        exchangeRates: { USD: 1, EUR: 0.85 },
        exchangeRatesSource: '2024-01-01',
      }

      expect(monthData.exchangeRates).toEqual({ USD: 1, EUR: 0.85 })
      expect(monthData.exchangeRatesSource).toBe('2024-01-01')
    })
  })

  describe('BalanceSourceData', () => {
    it('should have correct structure', () => {
      const balanceSource: BalanceSourceData = {
        id: 'balance-1',
        description: 'Opening balance',
        amount: 1000,
        currency: 'USD',
      }

      expect(balanceSource.id).toBe('balance-1')
      expect(balanceSource.description).toBe('Opening balance')
      expect(balanceSource.amount).toBe(1000)
      expect(balanceSource.currency).toBe('USD')
    })
  })

  describe('IncomeEntryData', () => {
    it('should have correct structure with date', () => {
      const incomeEntry: IncomeEntryData = {
        id: 'income-1',
        description: 'Salary',
        amount: 5000,
        currency: 'USD',
        date: '2024-01-15',
      }

      expect(incomeEntry.id).toBe('income-1')
      expect(incomeEntry.description).toBe('Salary')
      expect(incomeEntry.amount).toBe(5000)
      expect(incomeEntry.currency).toBe('USD')
      expect(incomeEntry.date).toBe('2024-01-15')
    })

    it('should support null date', () => {
      const incomeEntry: IncomeEntryData = {
        id: 'income-1',
        description: 'Bonus',
        amount: 1000,
        currency: 'USD',
        date: null,
      }

      expect(incomeEntry.date).toBeNull()
    })
  })

  describe('ExpenseEntryData', () => {
    it('should have correct structure with date', () => {
      const expenseEntry: ExpenseEntryData = {
        id: 'expense-1',
        description: 'Rent',
        amount: 1500,
        currency: 'USD',
        date: '2024-01-01',
      }

      expect(expenseEntry.id).toBe('expense-1')
      expect(expenseEntry.description).toBe('Rent')
      expect(expenseEntry.amount).toBe(1500)
      expect(expenseEntry.currency).toBe('USD')
      expect(expenseEntry.date).toBe('2024-01-01')
    })

    it('should support null date', () => {
      const expenseEntry: ExpenseEntryData = {
        id: 'expense-1',
        description: 'Groceries',
        amount: 200,
        currency: 'USD',
        date: null,
      }

      expect(expenseEntry.date).toBeNull()
    })
  })

  describe('BudgetEntry union type', () => {
    it('should accept BalanceSourceData', () => {
      const entry: BudgetEntry = {
        id: 'balance-1',
        description: 'Opening balance',
        amount: 1000,
        currency: 'USD',
      }

      expect(entry.id).toBe('balance-1')
    })

    it('should accept IncomeEntryData', () => {
      const entry: BudgetEntry = {
        id: 'income-1',
        description: 'Salary',
        amount: 5000,
        currency: 'USD',
        date: '2024-01-15',
      }

      expect(entry.id).toBe('income-1')
    })

    it('should accept ExpenseEntryData', () => {
      const entry: BudgetEntry = {
        id: 'expense-1',
        description: 'Rent',
        amount: 1500,
        currency: 'USD',
        date: '2024-01-01',
      }

      expect(entry.id).toBe('expense-1')
    })
  })

  describe('UserSettings', () => {
    it('should have correct structure', () => {
      const settings: UserSettings = {
        baseCurrency: 'USD',
      }

      expect(settings.baseCurrency).toBe('USD')
    })

    it('should support different currencies', () => {
      const eurSettings: UserSettings = {
        baseCurrency: 'EUR',
      }

      const gbpSettings: UserSettings = {
        baseCurrency: 'GBP',
      }

      expect(eurSettings.baseCurrency).toBe('EUR')
      expect(gbpSettings.baseCurrency).toBe('GBP')
    })
  })
})
