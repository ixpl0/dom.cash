import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getNextMonth, getPreviousMonth, findClosestMonthForCopy, isFirstMonth, isLastMonth } from '~~/shared/utils/month-helpers'
import type { MonthData } from '~~/shared/types/budget'

describe('shared/utils/month-helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getNextMonth', () => {
    it('should return current month when no months exist', () => {
      vi.setSystemTime(new Date('2025-03-15T10:30:00Z'))

      const result = getNextMonth([])

      expect(result).toEqual({ year: 2025, month: 2 })
    })

    it('should return next month correctly for middle of year', () => {
      const months: MonthData[] = [
        { id: '1', year: 2025, month: 2, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
        { id: '2', year: 2025, month: 1, userMonthId: 'user-month-2', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = getNextMonth(months)

      expect(result).toEqual({ year: 2025, month: 3 })
    })

    it('should wrap to next year when current month is December', () => {
      const months: MonthData[] = [
        { id: '1', year: 2024, month: 11, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
        { id: '2', year: 2024, month: 10, userMonthId: 'user-month-2', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = getNextMonth(months)

      expect(result).toEqual({ year: 2025, month: 0 })
    })

    it('should handle unsorted months correctly', () => {
      const months: MonthData[] = [
        { id: '1', year: 2024, month: 5, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
        { id: '2', year: 2025, month: 3, userMonthId: 'user-month-2', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
        { id: '3', year: 2024, month: 11, userMonthId: 'user-month-3', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = getNextMonth(months)

      expect(result).toEqual({ year: 2025, month: 4 })
    })

    it('should handle single month', () => {
      const months: MonthData[] = [
        { id: '1', year: 2025, month: 6, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = getNextMonth(months)

      expect(result).toEqual({ year: 2025, month: 7 })
    })
  })

  describe('getPreviousMonth', () => {
    it('should return current month when no months exist', () => {
      vi.setSystemTime(new Date('2025-03-15T10:30:00Z'))

      const result = getPreviousMonth([])

      expect(result).toEqual({ year: 2025, month: 2 })
    })

    it('should return previous month correctly for middle of year', () => {
      const months: MonthData[] = [
        { id: '1', year: 2025, month: 5, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
        { id: '2', year: 2025, month: 3, userMonthId: 'user-month-2', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = getPreviousMonth(months)

      expect(result).toEqual({ year: 2025, month: 2 })
    })

    it('should wrap to previous year when earliest month is January', () => {
      const months: MonthData[] = [
        { id: '1', year: 2025, month: 0, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
        { id: '2', year: 2025, month: 2, userMonthId: 'user-month-2', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = getPreviousMonth(months)

      expect(result).toEqual({ year: 2024, month: 11 })
    })

    it('should handle unsorted months correctly', () => {
      const months: MonthData[] = [
        { id: '1', year: 2025, month: 5, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
        { id: '2', year: 2024, month: 8, userMonthId: 'user-month-2', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
        { id: '3', year: 2025, month: 3, userMonthId: 'user-month-3', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = getPreviousMonth(months)

      expect(result).toEqual({ year: 2024, month: 7 })
    })

    it('should handle single month', () => {
      const months: MonthData[] = [
        { id: '1', year: 2025, month: 6, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = getPreviousMonth(months)

      expect(result).toEqual({ year: 2025, month: 5 })
    })
  })

  describe('findClosestMonthForCopy', () => {
    const monthsData: MonthData[] = [
      { id: 'month-2024-06', year: 2024, month: 6, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      { id: 'month-2024-08', year: 2024, month: 8, userMonthId: 'user-month-2', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      { id: 'month-2025-01', year: 2025, month: 1, userMonthId: 'user-month-3', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      { id: 'month-2025-03', year: 2025, month: 3, userMonthId: 'user-month-4', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
    ]

    it('should return undefined for empty months array', () => {
      const result = findClosestMonthForCopy([], 2025, 2, 'next')

      expect(result).toBeUndefined()
    })

    it('should find closest previous month for next direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2025, 2, 'next')

      expect(result).toBe('month-2025-01')
    })

    it('should find closest next month for previous direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2024, 7, 'previous')

      expect(result).toBe('month-2024-08')
    })

    it('should return undefined when no suitable month found for next direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2023, 5, 'next')

      expect(result).toBeUndefined()
    })

    it('should return undefined when no suitable month found for previous direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2026, 5, 'previous')

      expect(result).toBeUndefined()
    })

    it('should find closest month when multiple candidates exist for next direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2025, 5, 'next')

      expect(result).toBe('month-2025-03')
    })

    it('should find closest month when multiple candidates exist for previous direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2024, 5, 'previous')

      expect(result).toBe('month-2024-06')
    })

    it('should handle year boundary correctly for next direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2025, 0, 'next')

      expect(result).toBe('month-2024-08')
    })

    it('should handle year boundary correctly for previous direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2025, 0, 'previous')

      expect(result).toBe('month-2025-01')
    })

    it('should handle single month scenario for next direction', () => {
      const singleMonth: MonthData[] = [
        { id: 'single-month', year: 2024, month: 5, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = findClosestMonthForCopy(singleMonth, 2024, 7, 'next')

      expect(result).toBe('single-month')
    })

    it('should handle single month scenario for previous direction', () => {
      const singleMonth: MonthData[] = [
        { id: 'single-month', year: 2024, month: 5, userMonthId: 'user-month-1', balanceSources: [], incomeEntries: [], expenseEntries: [], balanceChange: 0, pocketExpenses: 0, income: 0 },
      ]

      const result = findClosestMonthForCopy(singleMonth, 2024, 3, 'previous')

      expect(result).toBe('single-month')
    })

    it('should return undefined when target month equals available month for next direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2025, 1, 'next')

      expect(result).toBe('month-2024-08')
    })

    it('should return undefined when target month equals available month for previous direction', () => {
      const result = findClosestMonthForCopy(monthsData, 2025, 1, 'previous')

      expect(result).toBe('month-2025-03')
    })
  })

  describe('isFirstMonth', () => {
    const createMockMonth = (id: string, year: number, month: number): MonthData => ({
      id,
      year,
      month,
      userMonthId: id,
      balanceSources: [],
      incomeEntries: [],
      expenseEntries: [],
      balanceChange: 0,
      pocketExpenses: 0,
      income: 0,
      exchangeRates: {},
      exchangeRatesSource: '',
    })

    it('should return true for single month', () => {
      const month = createMockMonth('1', 2024, 0)
      const allMonths = [month]

      const result = isFirstMonth(month, allMonths)

      expect(result).toBe(true)
    })

    it('should return true for earliest month', () => {
      const firstMonth = createMockMonth('1', 2023, 11)
      const secondMonth = createMockMonth('2', 2024, 0)
      const thirdMonth = createMockMonth('3', 2024, 1)
      const allMonths = [secondMonth, firstMonth, thirdMonth]

      const result = isFirstMonth(firstMonth, allMonths)

      expect(result).toBe(true)
    })

    it('should return false for middle month', () => {
      const firstMonth = createMockMonth('1', 2023, 11)
      const secondMonth = createMockMonth('2', 2024, 0)
      const thirdMonth = createMockMonth('3', 2024, 1)
      const allMonths = [secondMonth, firstMonth, thirdMonth]

      const result = isFirstMonth(secondMonth, allMonths)

      expect(result).toBe(false)
    })

    it('should return false for last month', () => {
      const firstMonth = createMockMonth('1', 2023, 11)
      const secondMonth = createMockMonth('2', 2024, 0)
      const thirdMonth = createMockMonth('3', 2024, 1)
      const allMonths = [secondMonth, firstMonth, thirdMonth]

      const result = isFirstMonth(thirdMonth, allMonths)

      expect(result).toBe(false)
    })

    it('should handle months from different years correctly', () => {
      const month2022 = createMockMonth('1', 2022, 5)
      const month2023 = createMockMonth('2', 2023, 2)
      const month2024 = createMockMonth('3', 2024, 8)
      const allMonths = [month2023, month2024, month2022]

      const result = isFirstMonth(month2022, allMonths)

      expect(result).toBe(true)
    })

    it('should return false for empty array', () => {
      const month = createMockMonth('1', 2024, 0)
      const allMonths: MonthData[] = []

      const result = isFirstMonth(month, allMonths)

      expect(result).toBe(false)
    })
  })

  describe('isLastMonth', () => {
    const createMockMonth = (id: string, year: number, month: number): MonthData => ({
      id,
      year,
      month,
      userMonthId: id,
      balanceSources: [],
      incomeEntries: [],
      expenseEntries: [],
      balanceChange: 0,
      pocketExpenses: 0,
      income: 0,
      exchangeRates: {},
      exchangeRatesSource: '',
    })

    it('should return false for single month', () => {
      const month = createMockMonth('1', 2024, 0)
      const allMonths = [month]

      const result = isLastMonth(month, allMonths)

      expect(result).toBe(false)
    })

    it('should return true for latest month', () => {
      const firstMonth = createMockMonth('1', 2023, 11)
      const secondMonth = createMockMonth('2', 2024, 0)
      const thirdMonth = createMockMonth('3', 2024, 1)
      const allMonths = [secondMonth, firstMonth, thirdMonth]

      const result = isLastMonth(thirdMonth, allMonths)

      expect(result).toBe(true)
    })

    it('should return false for middle month', () => {
      const firstMonth = createMockMonth('1', 2023, 11)
      const secondMonth = createMockMonth('2', 2024, 0)
      const thirdMonth = createMockMonth('3', 2024, 1)
      const allMonths = [secondMonth, firstMonth, thirdMonth]

      const result = isLastMonth(secondMonth, allMonths)

      expect(result).toBe(false)
    })

    it('should return false for first month', () => {
      const firstMonth = createMockMonth('1', 2023, 11)
      const secondMonth = createMockMonth('2', 2024, 0)
      const thirdMonth = createMockMonth('3', 2024, 1)
      const allMonths = [secondMonth, firstMonth, thirdMonth]

      const result = isLastMonth(firstMonth, allMonths)

      expect(result).toBe(false)
    })

    it('should handle months from different years correctly', () => {
      const month2022 = createMockMonth('1', 2022, 5)
      const month2023 = createMockMonth('2', 2023, 2)
      const month2024 = createMockMonth('3', 2024, 8)
      const allMonths = [month2023, month2024, month2022]

      const result = isLastMonth(month2024, allMonths)

      expect(result).toBe(true)
    })

    it('should return false for empty array', () => {
      const month = createMockMonth('1', 2024, 0)
      const allMonths: MonthData[] = []

      const result = isLastMonth(month, allMonths)

      expect(result).toBe(false)
    })
  })
})
