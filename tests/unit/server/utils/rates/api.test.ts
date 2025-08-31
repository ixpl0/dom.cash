import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MOCK_HISTORICAL_RATES_RESPONSE } from '#fixtures/api-responses'
import { MOCK_HISTORICAL_RATES } from '#fixtures/currency-rates'

import { fetchHistoricalRates } from '~~/server/utils/rates/api'

const mockFetch = vi.fn()
global.fetch = mockFetch

const originalEnv = process.env
beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...originalEnv }
  process.env.OPENEXCHANGERATES_APP_ID = 'test-api-key'
})

afterEach(() => {
  process.env = originalEnv
})

describe('server/utils/rates/api', () => {
  describe('fetchHistoricalRates', () => {
    it('should fetch and return historical rates successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_HISTORICAL_RATES_RESPONSE),
      })

      const result = await fetchHistoricalRates('2025-01-31')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openexchangerates.org/api/historical/2025-01-31.json?app_id=test-api-key',
      )
      expect(result).toEqual(MOCK_HISTORICAL_RATES)
    })

    it('should handle different date formats', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_HISTORICAL_RATES_RESPONSE),
      })

      await fetchHistoricalRates('2024-12-31')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openexchangerates.org/api/historical/2024-12-31.json?app_id=test-api-key',
      )
    })

    it('should handle API error for historical data', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(fetchHistoricalRates('2025-01-31')).rejects.toThrow(
        'OpenExchangeRates API error: 404 Not Found',
      )
    })

    it('should handle network errors for historical data', async () => {
      const networkError = new Error('Network timeout')
      mockFetch.mockRejectedValue(networkError)

      await expect(fetchHistoricalRates('2025-01-31')).rejects.toThrow('Network timeout')
    })

    it('should handle missing API key for historical data', async () => {
      delete process.env.OPENEXCHANGERATES_APP_ID

      await expect(fetchHistoricalRates('2025-01-31')).rejects.toThrow(
        'API key not configured',
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle special characters in date parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_HISTORICAL_RATES_RESPONSE),
      })

      await fetchHistoricalRates('2025/01/31')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openexchangerates.org/api/historical/2025/01/31.json?app_id=test-api-key',
      )
    })
  })

  describe('URL construction', () => {
    it('should construct correct URL for historical rates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_HISTORICAL_RATES_RESPONSE),
      })

      await fetchHistoricalRates('2025-01-15')

      const expectedUrl = 'https://openexchangerates.org/api/historical/2025-01-15.json?app_id=test-api-key'
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl)
    })

    it('should handle special API key characters', async () => {
      process.env.OPENEXCHANGERATES_APP_ID = 'key-with-special&chars=123'

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_HISTORICAL_RATES_RESPONSE),
      })

      await fetchHistoricalRates('2025-01-31')

      const expectedUrl = 'https://openexchangerates.org/api/historical/2025-01-31.json?app_id=key-with-special&chars=123'
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl)
    })
  })

  describe('Response parsing', () => {
    it('should extract rates from complete API response', async () => {
      const fullResponse = {
        ...MOCK_HISTORICAL_RATES_RESPONSE,
        extra_field: 'should be ignored',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fullResponse),
      })

      const result = await fetchHistoricalRates('2025-01-31')

      expect(result).toEqual(MOCK_HISTORICAL_RATES)
      expect(result).not.toHaveProperty('disclaimer')
      expect(result).not.toHaveProperty('license')
      expect(result).not.toHaveProperty('timestamp')
    })

    it('should handle empty rates object', async () => {
      const emptyRatesResponse = {
        ...MOCK_HISTORICAL_RATES_RESPONSE,
        rates: {},
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyRatesResponse),
      })

      const result = await fetchHistoricalRates('2025-01-31')

      expect(result).toEqual({})
    })
  })

  describe('Error scenarios', () => {
    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(fetchHistoricalRates('2025-01-31')).rejects.toThrow(
        'OpenExchangeRates API error: 500 Internal Server Error',
      )
    })

    it('should handle 403 forbidden error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      })

      await expect(fetchHistoricalRates('2025-01-31')).rejects.toThrow(
        'OpenExchangeRates API error: 403 Forbidden',
      )
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      mockFetch.mockRejectedValue(timeoutError)

      await expect(fetchHistoricalRates('2025-01-31')).rejects.toThrow('Request timeout')
    })

    it('should handle DNS resolution errors', async () => {
      const dnsError = new Error('ENOTFOUND openexchangerates.org')
      mockFetch.mockRejectedValue(dnsError)

      await expect(fetchHistoricalRates('2025-01-31')).rejects.toThrow('ENOTFOUND openexchangerates.org')
    })
  })
})
