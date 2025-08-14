import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatAmount, calculateTotalBalance, getBalanceChangeClass } from '~~/shared/utils/budget'
import type { BudgetEntry } from '~~/shared/types/budget'

const mockNumberFormatConstructor = vi.fn() as any
mockNumberFormatConstructor.supportedLocalesOf = vi.fn()

Object.defineProperty(globalThis, 'Intl', {
  value: {
    NumberFormat: mockNumberFormatConstructor,
  },
  writable: true,
})

describe('shared/utils/budget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatAmount', () => {
    it('should format amount correctly with currency', () => {
      const mockFormat = vi.fn().mockReturnValue('1 000,50 ₽')
      mockNumberFormatConstructor.mockReturnValue({
        format: mockFormat,
      })

      globalThis.Intl.NumberFormat = mockNumberFormatConstructor

      const result = formatAmount(1000.5, 'RUB')

      expect(result).toBe('1 000,50 ₽')
      expect(mockNumberFormatConstructor).toHaveBeenCalledWith('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
      expect(mockFormat).toHaveBeenCalledWith(1000.5)
    })

    it('should format USD currency', () => {
      const mockFormat = vi.fn().mockReturnValue('$100.00')
      mockNumberFormatConstructor.mockReturnValue({
        format: mockFormat,
      })

      globalThis.Intl.NumberFormat = mockNumberFormatConstructor

      const result = formatAmount(100, 'USD')

      expect(result).toBe('$100.00')
      expect(mockNumberFormatConstructor).toHaveBeenCalledWith('ru-RU', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    })

    it('should handle zero amount', () => {
      const mockFormat = vi.fn().mockReturnValue('0 ₽')
      mockNumberFormatConstructor.mockReturnValue({
        format: mockFormat,
      })

      globalThis.Intl.NumberFormat = mockNumberFormatConstructor

      const result = formatAmount(0, 'RUB')

      expect(result).toBe('0 ₽')
      expect(mockFormat).toHaveBeenCalledWith(0)
    })

    it('should handle negative amount', () => {
      const mockFormat = vi.fn().mockReturnValue('-500,25 ₽')
      mockNumberFormatConstructor.mockReturnValue({
        format: mockFormat,
      })

      globalThis.Intl.NumberFormat = mockNumberFormatConstructor

      const result = formatAmount(-500.25, 'RUB')

      expect(result).toBe('-500,25 ₽')
      expect(mockFormat).toHaveBeenCalledWith(-500.25)
    })
  })

  describe('calculateTotalBalance', () => {
    it('should return 0 for empty entries array', () => {
      const result = calculateTotalBalance([], 'USD', {})

      expect(result).toBe(0)
    })

    it('should return 0 for null entries', () => {
      const result = calculateTotalBalance(null as any, 'USD', {})

      expect(result).toBe(0)
    })

    it('should return 0 for undefined entries', () => {
      const result = calculateTotalBalance(undefined as any, 'USD', {})

      expect(result).toBe(0)
    })

    it('should calculate total for same currency entries', () => {
      const entries: BudgetEntry[] = [
        { id: '1', amount: 100, currency: 'USD', description: 'Test 1' },
        { id: '2', amount: 200, currency: 'USD', description: 'Test 2' },
        { id: '3', amount: -50, currency: 'USD', description: 'Test 3' },
      ]

      const result = calculateTotalBalance(entries, 'USD', {})

      expect(result).toBe(250)
    })

    it('should convert different currencies correctly', () => {
      const entries: BudgetEntry[] = [
        { id: '1', amount: 100, currency: 'USD', description: 'Test 1' },
        { id: '2', amount: 200, currency: 'EUR', description: 'Test 2' },
      ]

      const exchangeRates = {
        USD: 1,
        EUR: 0.85,
      }

      const result = calculateTotalBalance(entries, 'USD', exchangeRates)

      expect(result).toBeCloseTo(335.29, 2)
    })

    it('should handle missing exchange rates with default rate 1', () => {
      const entries: BudgetEntry[] = [
        { id: '1', amount: 100, currency: 'USD', description: 'Test 1' },
        { id: '2', amount: 200, currency: 'UNKNOWN', description: 'Test 2' },
      ]

      const exchangeRates = {
        USD: 1,
      }

      const result = calculateTotalBalance(entries, 'USD', exchangeRates)

      expect(result).toBe(300)
    })

    it('should handle missing base currency rate with default rate 1', () => {
      const entries: BudgetEntry[] = [
        { id: '1', amount: 100, currency: 'USD', description: 'Test 1' },
      ]

      const exchangeRates = {}

      const result = calculateTotalBalance(entries, 'USD', exchangeRates)

      expect(result).toBe(100)
    })

    it('should handle complex multi-currency calculation', () => {
      const entries: BudgetEntry[] = [
        { id: '1', amount: 1000, currency: 'RUB', description: 'Test 1' },
        { id: '2', amount: 100, currency: 'USD', description: 'Test 2' },
        { id: '3', amount: 50, currency: 'EUR', description: 'Test 3' },
      ]

      const exchangeRates = {
        USD: 1,
        EUR: 0.9,
        RUB: 90,
      }

      const result = calculateTotalBalance(entries, 'USD', exchangeRates)

      expect(result).toBeCloseTo(166.67, 2)
    })
  })

  describe('getBalanceChangeClass', () => {
    it('should return success class for positive balance', () => {
      const result = getBalanceChangeClass(100)

      expect(result).toBe('text-success')
    })

    it('should return success class for small positive balance', () => {
      const result = getBalanceChangeClass(0.01)

      expect(result).toBe('text-success')
    })

    it('should return error class for negative balance', () => {
      const result = getBalanceChangeClass(-100)

      expect(result).toBe('text-error')
    })

    it('should return error class for small negative balance', () => {
      const result = getBalanceChangeClass(-0.01)

      expect(result).toBe('text-error')
    })

    it('should return base content class for zero balance', () => {
      const result = getBalanceChangeClass(0)

      expect(result).toBe('text-base-content')
    })

    it('should handle edge case of -0', () => {
      const result = getBalanceChangeClass(-0)

      expect(result).toBe('text-base-content')
    })
  })
})
