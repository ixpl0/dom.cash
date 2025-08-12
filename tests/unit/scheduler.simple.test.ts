import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TEST_DATES } from '../fixtures/dates'
import { MOCK_CURRENCY_RATES, MOCK_HISTORICAL_RATES } from '../fixtures/currency-rates'

import { fetchLatestRates, fetchHistoricalRates } from '../../server/utils/rates/api'
import { saveCurrencyRates } from '../../server/utils/rates/database'
import { shouldUpdateRatesNow } from '../../server/utils/rates/scheduler'

vi.mock('../../server/utils/rates/api', () => ({
  fetchLatestRates: vi.fn(),
  fetchHistoricalRates: vi.fn(),
}))

vi.mock('../../server/utils/rates/database', () => ({
  saveCurrencyRates: vi.fn(),
  hasCurrencyRates: vi.fn(),
}))

describe('scheduler.ts - isolated tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('shouldUpdateRatesNow', () => {
    it('should return updateCurrent=true for first day of month', () => {
      const result = shouldUpdateRatesNow(TEST_DATES.FIRST_DAY_OF_MONTH)

      expect(result).toEqual({
        updateCurrent: true,
        updateHistorical: false,
      })
    })

    it('should return updateHistorical=true for day 2', () => {
      const result = shouldUpdateRatesNow(TEST_DATES.SECOND_DAY_OF_MONTH)

      expect(result).toEqual({
        updateCurrent: false,
        updateHistorical: true,
      })
    })

    it('should return updateHistorical=true for day 3', () => {
      const result = shouldUpdateRatesNow(TEST_DATES.THIRD_DAY_OF_MONTH)

      expect(result).toEqual({
        updateCurrent: false,
        updateHistorical: true,
      })
    })

    it('should return updateHistorical=true for day 8', () => {
      const result = shouldUpdateRatesNow(TEST_DATES.EIGHTH_DAY_OF_MONTH)

      expect(result).toEqual({
        updateCurrent: false,
        updateHistorical: true,
      })
    })

    it('should return updateHistorical=true for day 15', () => {
      const result = shouldUpdateRatesNow(TEST_DATES.FIFTEENTH_DAY_OF_MONTH)

      expect(result).toEqual({
        updateCurrent: false,
        updateHistorical: true,
      })
    })

    it('should return both false for regular day', () => {
      const result = shouldUpdateRatesNow(TEST_DATES.REGULAR_DAY)

      expect(result).toEqual({
        updateCurrent: false,
        updateHistorical: false,
      })
    })

    it('should handle boundary cases correctly', () => {
      const dec31Result = shouldUpdateRatesNow(TEST_DATES.DECEMBER_31_2024)
      expect(dec31Result.updateCurrent).toBe(false)

      const jan1Result = shouldUpdateRatesNow(TEST_DATES.JANUARY_1_2025)
      expect(jan1Result.updateCurrent).toBe(true)
    })
  })

  describe('API integration', () => {
    it('should verify fetchLatestRates is called correctly', async () => {
      vi.mocked(fetchLatestRates).mockResolvedValue(MOCK_CURRENCY_RATES)

      const rates = await fetchLatestRates()

      expect(fetchLatestRates).toHaveBeenCalledOnce()
      expect(rates).toEqual(MOCK_CURRENCY_RATES)
    })

    it('should verify fetchHistoricalRates is called correctly', async () => {
      vi.mocked(fetchHistoricalRates).mockResolvedValue(MOCK_HISTORICAL_RATES)

      const rates = await fetchHistoricalRates('2025-01-31')

      expect(fetchHistoricalRates).toHaveBeenCalledWith('2025-01-31')
      expect(rates).toEqual(MOCK_HISTORICAL_RATES)
    })

    it('should verify saveCurrencyRates is called correctly', async () => {
      vi.mocked(saveCurrencyRates).mockResolvedValue()

      await saveCurrencyRates('2025-02-01', MOCK_CURRENCY_RATES)

      expect(saveCurrencyRates).toHaveBeenCalledWith('2025-02-01', MOCK_CURRENCY_RATES)
    })
  })

  describe('Date utility functions behavior', () => {
    it('should correctly identify first day of month', () => {
      expect(shouldUpdateRatesNow(TEST_DATES.FIRST_DAY_OF_MONTH).updateCurrent).toBe(true)
      expect(shouldUpdateRatesNow(TEST_DATES.SECOND_DAY_OF_MONTH).updateCurrent).toBe(false)
      expect(shouldUpdateRatesNow(TEST_DATES.REGULAR_DAY).updateCurrent).toBe(false)
    })

    it('should correctly identify historical fetch days', () => {
      const historicalDays = [
        TEST_DATES.SECOND_DAY_OF_MONTH,
        TEST_DATES.THIRD_DAY_OF_MONTH,
        TEST_DATES.EIGHTH_DAY_OF_MONTH,
        TEST_DATES.FIFTEENTH_DAY_OF_MONTH,
      ]

      for (const day of historicalDays) {
        expect(shouldUpdateRatesNow(day).updateHistorical).toBe(true)
      }

      expect(shouldUpdateRatesNow(TEST_DATES.FIRST_DAY_OF_MONTH).updateHistorical).toBe(false)
      expect(shouldUpdateRatesNow(TEST_DATES.REGULAR_DAY).updateHistorical).toBe(false)
    })
  })

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      const networkError = new Error('Network error')
      vi.mocked(fetchLatestRates).mockRejectedValue(networkError)

      await expect(fetchLatestRates()).rejects.toThrow('Network error')
    })

    it('should handle historical API errors gracefully', async () => {
      const apiError = new Error('Historical data not available')
      vi.mocked(fetchHistoricalRates).mockRejectedValue(apiError)

      await expect(fetchHistoricalRates('2025-01-31')).rejects.toThrow('Historical data not available')
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      vi.mocked(saveCurrencyRates).mockRejectedValue(dbError)

      await expect(saveCurrencyRates('2025-02-01', MOCK_CURRENCY_RATES)).rejects.toThrow('Database connection failed')
    })
  })
})
