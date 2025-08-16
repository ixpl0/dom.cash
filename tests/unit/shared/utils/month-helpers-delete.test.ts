import { describe, it, expect } from 'vitest'

import { isFirstMonth, isLastMonth } from '~~/shared/utils/month-helpers'
import type { MonthData } from '~~/shared/types/budget'

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

describe('shared/utils/month-helpers deletion functions', () => {
  describe('isFirstMonth', () => {
    it('should return false for single month', () => {
      const month = createMockMonth('1', 2024, 0)
      const allMonths = [month]

      const result = isFirstMonth(month, allMonths)

      expect(result).toBe(false)
    })

    it('should return true for chronologically first month', () => {
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
    it('should return false for single month', () => {
      const month = createMockMonth('1', 2024, 0)
      const allMonths = [month]

      const result = isLastMonth(month, allMonths)

      expect(result).toBe(false)
    })

    it('should return true for chronologically last month', () => {
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

    it('should work correctly with two months', () => {
      const firstMonth = createMockMonth('1', 2024, 0)
      const lastMonth = createMockMonth('2', 2024, 1)
      const allMonths = [firstMonth, lastMonth]

      expect(isFirstMonth(firstMonth, allMonths)).toBe(true)
      expect(isLastMonth(firstMonth, allMonths)).toBe(false)
      expect(isFirstMonth(lastMonth, allMonths)).toBe(false)
      expect(isLastMonth(lastMonth, allMonths)).toBe(true)
    })
  })
})
