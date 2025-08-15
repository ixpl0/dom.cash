import { describe, it, expect } from 'vitest'
import type * as budgetTypes from '~~/shared/types/budget'
import * as indexExports from '~~/shared/types/index'

describe('Shared Types Index', () => {
  it('should export all budget types', () => {
    expect(indexExports).toBeDefined()
  })

  it('should have MonthData type available', () => {
    const monthData: budgetTypes.MonthData = {
      id: 'test',
      year: 2024,
      month: 0,
      userMonthId: 'test',
      balanceSources: [],
      incomeEntries: [],
      expenseEntries: [],
      balanceChange: 0,
      pocketExpenses: 0,
      income: 0,
    }

    expect(monthData).toBeDefined()
  })

  it('should have UserSettings type available', () => {
    const settings: budgetTypes.UserSettings = {
      baseCurrency: 'USD',
    }

    expect(settings).toBeDefined()
  })

  it('should have BudgetEntry union type available', () => {
    const entry: budgetTypes.BudgetEntry = {
      id: 'test',
      description: 'Test entry',
      amount: 100,
      currency: 'USD',
    }

    expect(entry).toBeDefined()
  })
})
