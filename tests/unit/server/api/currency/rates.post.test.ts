import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Set up global mocks for h3 functions that are auto-imported
globalThis.defineEventHandler = vi.fn(handler => handler)
globalThis.readBody = vi.fn()

vi.mock('~~/server/utils/rates/database', () => ({
  saveCurrencyRates: vi.fn(),
}))

let mockReadBody: ReturnType<typeof vi.fn>
let mockSaveCurrencyRates: ReturnType<typeof vi.fn>

describe('server/api/currency/rates.post', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const database = await import('~~/server/utils/rates/database')

    mockReadBody = globalThis.readBody as ReturnType<typeof vi.fn>
    mockSaveCurrencyRates = database.saveCurrencyRates as ReturnType<typeof vi.fn>
  })

  it('should successfully save currency rates with valid data', async () => {
    const mockEvent = {} as H3Event
    const mockBody = {
      date: '2025-02-01',
      rates: { USD: 1, EUR: 0.85, GBP: 0.73 },
    }

    mockReadBody.mockResolvedValue(mockBody)
    mockSaveCurrencyRates.mockResolvedValue(undefined)

    const handler = await import('~~/server/api/currency/rates.post')
    const result = await handler.default(mockEvent)

    expect(mockReadBody).toHaveBeenCalledWith(mockEvent)
    expect(mockSaveCurrencyRates).toHaveBeenCalledWith('2025-02-01', { USD: 1, EUR: 0.85, GBP: 0.73 })
    expect(result).toEqual({ success: true })
  })

  it('should handle readBody errors', async () => {
    const mockEvent = {} as H3Event
    const bodyError = new Error('Failed to read body')

    mockReadBody.mockRejectedValue(bodyError)

    const handler = await import('~~/server/api/currency/rates.post')

    await expect(handler.default(mockEvent)).rejects.toThrow('Failed to read body')
  })

  it('should handle schema validation errors for invalid date format', async () => {
    const mockEvent = {} as H3Event
    const mockBody = {
      date: 'invalid-date',
      rates: { USD: 1 },
    }

    mockReadBody.mockResolvedValue(mockBody)

    const handler = await import('~~/server/api/currency/rates.post')

    await expect(handler.default(mockEvent)).rejects.toThrow()
  })

  it('should handle schema validation errors for invalid rates', async () => {
    const mockEvent = {} as H3Event
    const mockBody = {
      date: '2025-02-01',
      rates: { USD: 'not-a-number' },
    }

    mockReadBody.mockResolvedValue(mockBody)

    const handler = await import('~~/server/api/currency/rates.post')

    await expect(handler.default(mockEvent)).rejects.toThrow()
  })

  it('should handle saveCurrencyRates database errors', async () => {
    const mockEvent = {} as H3Event
    const mockBody = {
      date: '2025-02-01',
      rates: { USD: 1, EUR: 0.85 },
    }
    const dbError = new Error('Database save failed')

    mockReadBody.mockResolvedValue(mockBody)
    mockSaveCurrencyRates.mockRejectedValue(dbError)

    const handler = await import('~~/server/api/currency/rates.post')

    await expect(handler.default(mockEvent)).rejects.toThrow('Database save failed')
    expect(mockSaveCurrencyRates).toHaveBeenCalledWith('2025-02-01', { USD: 1, EUR: 0.85 })
  })

  it('should handle empty rates object', async () => {
    const mockEvent = {} as H3Event
    const mockBody = {
      date: '2025-02-01',
      rates: {},
    }

    mockReadBody.mockResolvedValue(mockBody)
    mockSaveCurrencyRates.mockResolvedValue(undefined)

    const handler = await import('~~/server/api/currency/rates.post')
    const result = await handler.default(mockEvent)

    expect(mockSaveCurrencyRates).toHaveBeenCalledWith('2025-02-01', {})
    expect(result).toEqual({ success: true })
  })

  it('should validate date format correctly', async () => {
    const mockEvent = {} as H3Event
    const mockBody = {
      date: '25-02-01', // Invalid format (year too short)
      rates: { USD: 1 },
    }

    mockReadBody.mockResolvedValue(mockBody)

    const handler = await import('~~/server/api/currency/rates.post')

    await expect(handler.default(mockEvent)).rejects.toThrow()
  })

  it('should handle missing required fields', async () => {
    const mockEvent = {} as H3Event
    const mockBody = {
      date: '2025-02-01',
      // Missing rates field
    }

    mockReadBody.mockResolvedValue(mockBody)

    const handler = await import('~~/server/api/currency/rates.post')

    await expect(handler.default(mockEvent)).rejects.toThrow()
  })
})
