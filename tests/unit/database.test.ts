import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MOCK_CURRENCY_RATES, MOCK_HISTORICAL_RATES, MOCK_DATABASE_RECORD } from '../fixtures/currency-rates'
import { EXPECTED_DATE_FORMATS } from '../fixtures/dates'

import { saveCurrencyRates, getCurrencyRates, hasCurrencyRates } from '~~/server/utils/rates/database'
import type { currency } from '~~/server/db/schema'

vi.mock('~~/server/db/schema', () => ({
  currency: {
    date: 'date_column',
    rates: 'rates_column',
  },
}))

vi.mock('~~/server/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

let mockInsert: ReturnType<typeof vi.fn>
let mockSelect: ReturnType<typeof vi.fn>
let mockEq: ReturnType<typeof vi.fn>
let mockCurrencySchema: typeof currency

describe('database.ts', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const { db } = await import('~~/server/db')
    const { currency } = await import('~~/server/db/schema')
    const { eq } = await import('drizzle-orm')

    mockInsert = db.insert as ReturnType<typeof vi.fn>
    mockSelect = db.select as ReturnType<typeof vi.fn>
    mockEq = eq as ReturnType<typeof vi.fn>
    mockCurrencySchema = currency

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    })

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
  })

  describe('saveCurrencyRates', () => {
    it('should save currency rates successfully', async () => {
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      const mockInsertChain = {
        values: mockValues,
      }
      mockInsert.mockReturnValue(mockInsertChain)

      await saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, MOCK_CURRENCY_RATES)

      expect(mockInsert).toHaveBeenCalledWith(mockCurrencySchema)
      expect(mockValues).toHaveBeenCalledWith({
        date: EXPECTED_DATE_FORMATS.FIRST_FEBRUARY,
        rates: MOCK_CURRENCY_RATES,
      })
      expect(mockValues().onConflictDoUpdate).toHaveBeenCalledWith({
        target: mockCurrencySchema.date,
        set: { rates: MOCK_CURRENCY_RATES },
      })
    })

    it('should handle upsert operation correctly', async () => {
      const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      })
      mockInsert.mockReturnValue({ values: mockValues })

      await saveCurrencyRates(EXPECTED_DATE_FORMATS.LAST_JANUARY, MOCK_HISTORICAL_RATES)

      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith({
        target: mockCurrencySchema.date,
        set: { rates: MOCK_HISTORICAL_RATES },
      })
    })

    it('should handle empty rates object', async () => {
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      mockInsert.mockReturnValue({ values: mockValues })

      const emptyRates = {}
      await saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, emptyRates)

      expect(mockValues).toHaveBeenCalledWith({
        date: EXPECTED_DATE_FORMATS.FIRST_FEBRUARY,
        rates: emptyRates,
      })
    })

    it('should handle special date formats', async () => {
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      mockInsert.mockReturnValue({ values: mockValues })

      await saveCurrencyRates('2024-02-29', MOCK_CURRENCY_RATES)

      expect(mockValues).toHaveBeenCalledWith({
        date: '2024-02-29',
        rates: MOCK_CURRENCY_RATES,
      })
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockRejectedValue(dbError),
      })
      mockInsert.mockReturnValue({ values: mockValues })

      await expect(
        saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, MOCK_CURRENCY_RATES),
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle constraint violation errors', async () => {
      const constraintError = new Error('UNIQUE constraint failed')
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockRejectedValue(constraintError),
      })
      mockInsert.mockReturnValue({ values: mockValues })

      await expect(
        saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, MOCK_CURRENCY_RATES),
      ).rejects.toThrow('UNIQUE constraint failed')
    })

    it('should handle large rates objects', async () => {
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      mockInsert.mockReturnValue({ values: mockValues })

      const largeRatesObject = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`CURRENCY_${i}`, Math.random()]),
      )

      await saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, largeRatesObject)

      expect(mockValues).toHaveBeenCalledWith({
        date: EXPECTED_DATE_FORMATS.FIRST_FEBRUARY,
        rates: largeRatesObject,
      })
    })
  })

  describe('getCurrencyRates', () => {
    it('should return currency rates when found', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([MOCK_DATABASE_RECORD]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await getCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY)

      expect(mockSelect).toHaveBeenCalled()
      expect(mockFrom).toHaveBeenCalledWith(mockCurrencySchema)
      expect(mockEq).toHaveBeenCalledWith(mockCurrencySchema.date, EXPECTED_DATE_FORMATS.FIRST_FEBRUARY)
      expect(result).toEqual(MOCK_CURRENCY_RATES)
    })

    it('should return null when no rates found', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await getCurrencyRates('2025-01-01')

      expect(result).toBeNull()
    })

    it('should return null when result has no rates property', async () => {
      const recordWithoutRates = { date: EXPECTED_DATE_FORMATS.FIRST_FEBRUARY }
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([recordWithoutRates]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await getCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY)

      expect(result).toBeNull()
    })

    it('should handle database query errors', async () => {
      const queryError = new Error('Database query failed')
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockRejectedValue(queryError),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      await expect(getCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY))
        .rejects.toThrow('Database query failed')
    })

    it('should handle invalid date format', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await getCurrencyRates('invalid-date')

      expect(mockEq).toHaveBeenCalledWith(mockCurrencySchema.date, 'invalid-date')
      expect(result).toBeNull()
    })

    it('should handle empty string date', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await getCurrencyRates('')

      expect(mockEq).toHaveBeenCalledWith(mockCurrencySchema.date, '')
      expect(result).toBeNull()
    })

    it('should limit results to 1', async () => {
      const mockLimit = vi.fn().mockResolvedValue([MOCK_DATABASE_RECORD])
      const mockWhere = vi.fn().mockReturnValue({
        limit: mockLimit,
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      await getCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY)

      expect(mockLimit).toHaveBeenCalledWith(1)
    })
  })

  describe('hasCurrencyRates', () => {
    it('should return true when rates exist', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([MOCK_DATABASE_RECORD]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await hasCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY)

      expect(result).toBe(true)
    })

    it('should return false when rates do not exist', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await hasCurrencyRates('2025-01-01')

      expect(result).toBe(false)
    })

    it('should return false when getCurrencyRates returns null', async () => {
      const recordWithoutRates = { date: EXPECTED_DATE_FORMATS.FIRST_FEBRUARY }
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([recordWithoutRates]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await hasCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY)

      expect(result).toBe(false)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection timeout')
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockRejectedValue(dbError),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      await expect(hasCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY))
        .rejects.toThrow('Database connection timeout')
    })

    it('should handle various date formats', async () => {
      const testDates = [
        '2025-01-01',
        '2024-12-31',
        '2024-02-29',
        EXPECTED_DATE_FORMATS.FIRST_FEBRUARY,
        EXPECTED_DATE_FORMATS.LAST_JANUARY,
      ]

      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      for (const date of testDates) {
        const result = await hasCurrencyRates(date)
        expect(result).toBe(false)
        expect(mockEq).toHaveBeenCalledWith(mockCurrencySchema.date, date)
      }
    })
  })

  describe('Integration scenarios', () => {
    it('should demonstrate full save and retrieve cycle', async () => {
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      mockInsert.mockReturnValue({ values: mockValues })

      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([MOCK_DATABASE_RECORD]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      await saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, MOCK_CURRENCY_RATES)

      expect(mockValues).toHaveBeenCalledWith({
        date: EXPECTED_DATE_FORMATS.FIRST_FEBRUARY,
        rates: MOCK_CURRENCY_RATES,
      })

      const rates = await getCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY)
      expect(rates).toEqual(MOCK_CURRENCY_RATES)

      const hasRates = await hasCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY)
      expect(hasRates).toBe(true)
    })

    it('should handle consecutive operations on same date', async () => {
      const firstRates = { USD: 1.0, EUR: 0.85 }
      const updatedRates = { USD: 1.0, EUR: 0.86, GBP: 0.73 }

      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      mockInsert.mockReturnValue({ values: mockValues })

      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{
          date: EXPECTED_DATE_FORMATS.FIRST_FEBRUARY,
          rates: updatedRates,
        }]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      await saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, firstRates)
      await saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, updatedRates)

      expect(mockValues).toHaveBeenCalledTimes(2)
      expect(mockValues).toHaveBeenLastCalledWith({
        date: EXPECTED_DATE_FORMATS.FIRST_FEBRUARY,
        rates: updatedRates,
      })

      const finalRates = await getCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY)
      expect(finalRates).toEqual(updatedRates)
    })
  })
})
