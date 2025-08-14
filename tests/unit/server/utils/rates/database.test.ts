import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MOCK_CURRENCY_RATES, MOCK_HISTORICAL_RATES, MOCK_DATABASE_RECORD } from '#fixtures/currency-rates'
import { EXPECTED_DATE_FORMATS } from '#fixtures/dates'

import { saveCurrencyRates, getCurrencyRates, hasCurrencyRates, hasRatesForCurrentMonth, saveHistoricalRatesForCurrentMonth } from '~~/server/utils/rates/database'
import type { currency } from '~~/server/db/schema'

vi.mock('~~/server/utils/rates/api', () => ({
  fetchHistoricalRates: vi.fn(),
}))

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

describe('server/utils/rates/database', () => {
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

    it('should reject empty rates object', async () => {
      const emptyRates = {}

      await expect(saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, emptyRates))
        .rejects.toThrow('Invalid rates data: empty or invalid object')
    })

    it('should reject invalid rate values', async () => {
      const invalidRates = { USD: -1, EUR: 'invalid' as any, GEL: NaN }

      await expect(saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, invalidRates))
        .rejects.toThrow('Invalid rate for currency USD: -1')
    })

    it('should reject invalid date format', async () => {
      const validRates = { USD: 1, EUR: 0.85 }

      await expect(saveCurrencyRates('invalid-date', validRates))
        .rejects.toThrow('Invalid date format: invalid-date. Expected YYYY-MM-DD')
    })

    it('should reject too large data', async () => {
      const largeRates: Record<string, number> = {}
      for (let i = 0; i < 5000; i++) {
        largeRates[`CURRENCY_${i.toString().padStart(10, '0')}`] = i + 1
      }

      await expect(saveCurrencyRates(EXPECTED_DATE_FORMATS.FIRST_FEBRUARY, largeRates))
        .rejects.toThrow('Rates data too large')
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
  })

  describe('hasRatesForCurrentMonth', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-02-15T10:30:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should check rates for first day of current month', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ rates: { USD: 1 } }]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await hasRatesForCurrentMonth()

      expect(result).toBe(true)
    })

    it('should return false when no rates exist for current month', async () => {
      const mockWhere = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      })
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
      })
      mockSelect.mockReturnValue({
        from: mockFrom,
      })

      const result = await hasRatesForCurrentMonth()

      expect(result).toBe(false)
    })
  })

  describe('saveHistoricalRatesForCurrentMonth', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-02-15T10:30:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should fetch and save historical rates for current month', async () => {
      const db = await import('~~/server/db')
      const mockDbImport = db.db as any

      const mockApi = await import('~~/server/utils/rates/api')
      const mockFetchHistoricalRates = mockApi.fetchHistoricalRates as ReturnType<typeof vi.fn>

      mockFetchHistoricalRates.mockResolvedValue(MOCK_HISTORICAL_RATES)

      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      mockDbImport.insert.mockReturnValue({ values: mockValues })

      await saveHistoricalRatesForCurrentMonth()

      expect(mockFetchHistoricalRates).toHaveBeenCalledWith('2025-01-31')

      expect(mockValues).toHaveBeenCalledWith({
        date: '2025-02-01',
        rates: MOCK_HISTORICAL_RATES,
      })
    })

    it('should handle different months correctly', async () => {
      vi.setSystemTime(new Date('2025-01-15T10:30:00Z'))

      const mockApi = await import('~~/server/utils/rates/api')
      const mockFetchHistoricalRates = mockApi.fetchHistoricalRates as ReturnType<typeof vi.fn>

      mockFetchHistoricalRates.mockResolvedValue(MOCK_HISTORICAL_RATES)

      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      const db = await import('~~/server/db')
      const mockDbImport = db.db as any
      mockDbImport.insert.mockReturnValue({ values: mockValues })

      await saveHistoricalRatesForCurrentMonth()

      expect(mockFetchHistoricalRates).toHaveBeenCalledWith('2024-12-31')
      expect(mockValues).toHaveBeenCalledWith({
        date: '2025-01-01',
        rates: MOCK_HISTORICAL_RATES,
      })
    })

    it('should handle leap year correctly', async () => {
      vi.setSystemTime(new Date('2024-03-15T10:30:00Z'))

      const mockApi = await import('~~/server/utils/rates/api')
      const mockFetchHistoricalRates = mockApi.fetchHistoricalRates as ReturnType<typeof vi.fn>

      mockFetchHistoricalRates.mockResolvedValue(MOCK_HISTORICAL_RATES)

      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      const db = await import('~~/server/db')
      const mockDbImport = db.db as any
      mockDbImport.insert.mockReturnValue({ values: mockValues })

      await saveHistoricalRatesForCurrentMonth()

      expect(mockFetchHistoricalRates).toHaveBeenCalledWith('2024-02-29')
      expect(mockValues).toHaveBeenCalledWith({
        date: '2024-03-01',
        rates: MOCK_HISTORICAL_RATES,
      })
    })

    it('should handle API errors', async () => {
      const mockApi = await import('~~/server/utils/rates/api')
      const mockFetchHistoricalRates = mockApi.fetchHistoricalRates as ReturnType<typeof vi.fn>

      const apiError = new Error('API request failed')
      mockFetchHistoricalRates.mockRejectedValue(apiError)

      await expect(saveHistoricalRatesForCurrentMonth()).rejects.toThrow('API request failed')

      expect(mockFetchHistoricalRates).toHaveBeenCalledWith('2025-01-31')
    })

    it('should handle database save errors', async () => {
      const mockApi = await import('~~/server/utils/rates/api')
      const mockFetchHistoricalRates = mockApi.fetchHistoricalRates as ReturnType<typeof vi.fn>

      mockFetchHistoricalRates.mockResolvedValue(MOCK_HISTORICAL_RATES)

      const dbError = new Error('Database save failed')
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockRejectedValue(dbError),
      })
      const db = await import('~~/server/db')
      const mockDbImport = db.db as any
      mockDbImport.insert.mockReturnValue({ values: mockValues })

      await expect(saveHistoricalRatesForCurrentMonth()).rejects.toThrow('Database save failed')
    })
  })
})
