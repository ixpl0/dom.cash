import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

vi.mock('h3', () => ({
  defineEventHandler: vi.fn(handler => handler),
  getRouterParam: vi.fn(),
  createError: vi.fn(error => new Error(error.statusMessage)),
}))

const mockDefineEventHandler = vi.fn(handler => handler)
global.defineEventHandler = mockDefineEventHandler

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  or: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}))

vi.mock('~~/server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
}))

vi.mock('~~/server/utils/auth', () => ({
  getUserFromRequest: vi.fn(),
}))

vi.mock('~~/server/services/months', () => ({
  getExchangeRatesForMonth: vi.fn(),
}))

let mockGetUserFromRequest: ReturnType<typeof vi.fn>
let mockGetRouterParam: ReturnType<typeof vi.fn>
let mockGetExchangeRatesForMonth: ReturnType<typeof vi.fn>
let mockDb: any

describe('server/api/budget/user/[username].get', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const h3 = await import('h3')
    const auth = await import('~~/server/utils/auth')
    const months = await import('~~/server/services/months')
    const db = await import('~~/server/db')

    mockGetUserFromRequest = auth.getUserFromRequest as ReturnType<typeof vi.fn>
    mockGetRouterParam = h3.getRouterParam as ReturnType<typeof vi.fn>
    mockGetExchangeRatesForMonth = months.getExchangeRatesForMonth as ReturnType<typeof vi.fn>
    mockDb = db.db
  })

  it('should include exchange rates for shared budget months', async () => {
    const mockEvent = {} as H3Event
    const mockCurrentUser = { id: 'user-123', username: 'currentuser' }
    const mockTargetUser = { id: 'user-456', username: 'targetuser', mainCurrency: 'USD' }
    const mockShareRecord = [{ access: 'read' }]
    const mockMonths = [
      { id: 'month-1', year: 2024, month: 0 },
      { id: 'month-2', year: 2024, month: 1 },
    ]
    const mockEntries = [
      {
        id: 'entry-1',
        monthId: 'month-1',
        kind: 'balance',
        description: 'Test balance',
        amount: 1000,
        currency: 'USD',
        date: null,
      },
      {
        id: 'entry-2',
        monthId: 'month-1',
        kind: 'income',
        description: 'Test income',
        amount: 500,
        currency: 'EUR',
        date: '2024-01-15',
      },
    ]
    const mockExchangeRates = {
      rates: { USD: 1, EUR: 0.85, RUB: 90 },
      source: '2024-01-01',
    }

    mockGetUserFromRequest.mockResolvedValue(mockCurrentUser)
    mockGetRouterParam.mockReturnValue('targetuser')
    mockGetExchangeRatesForMonth.mockResolvedValue(mockExchangeRates)

    let selectCallCount = 0
    mockDb.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([mockTargetUser])
            }
            if (selectCallCount === 2) {
              return Promise.resolve(mockShareRecord)
            }
            return Promise.resolve([])
          }),
          orderBy: vi.fn(() => Promise.resolve(mockMonths)),
        })),
        orderBy: vi.fn(() => Promise.resolve(mockMonths)),
      })),
    }))

    mockDb.select.mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockTargetUser])),
        })),
      })),
    }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockShareRecord)),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve(mockMonths)),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(mockEntries)),
        })),
      }))

    const handler = await import('~~/server/api/budget/user/[username].get')
    const result = await handler.default(mockEvent)

    expect(mockGetExchangeRatesForMonth).toHaveBeenCalledWith(2024, 0)
    expect(mockGetExchangeRatesForMonth).toHaveBeenCalledWith(2024, 1)
    expect(result.months).toHaveLength(2)
    expect(result.months[0].exchangeRates).toEqual(mockExchangeRates.rates)
    expect(result.months[0].exchangeRatesSource).toBe(mockExchangeRates.source)
    expect(result.months[1].exchangeRates).toEqual(mockExchangeRates.rates)
    expect(result.months[1].exchangeRatesSource).toBe(mockExchangeRates.source)
  })

  it('should handle missing exchange rates gracefully', async () => {
    const mockEvent = {} as H3Event
    const mockCurrentUser = { id: 'user-123', username: 'currentuser' }
    const mockTargetUser = { id: 'user-456', username: 'targetuser', mainCurrency: 'USD' }
    const mockShareRecord = [{ access: 'read' }]
    const mockMonths = [{ id: 'month-1', year: 2024, month: 0 }]

    mockGetUserFromRequest.mockResolvedValue(mockCurrentUser)
    mockGetRouterParam.mockReturnValue('targetuser')
    mockGetExchangeRatesForMonth.mockResolvedValue(undefined)

    let selectCallCount = 0
    mockDb.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([mockTargetUser])
            }
            if (selectCallCount === 2) {
              return Promise.resolve(mockShareRecord)
            }
            return Promise.resolve([])
          }),
          orderBy: vi.fn(() => Promise.resolve(mockMonths)),
        })),
        orderBy: vi.fn(() => Promise.resolve(mockMonths)),
      })),
    }))

    const handler = await import('~~/server/api/budget/user/[username].get')
    const result = await handler.default(mockEvent)

    expect(result.months[0].exchangeRates).toBeUndefined()
    expect(result.months[0].exchangeRatesSource).toBeUndefined()
  })

  it('should reject access when user not found', async () => {
    const mockEvent = {} as H3Event

    mockGetUserFromRequest.mockResolvedValue(null)
    mockGetRouterParam.mockReturnValue('targetuser')

    const handler = await import('~~/server/api/budget/user/[username].get')

    await expect(handler.default(mockEvent)).rejects.toThrow('Unauthorized')
  })

  it('should reject access when target user not found', async () => {
    const mockEvent = {} as H3Event
    const mockCurrentUser = { id: 'user-123' }

    mockGetUserFromRequest.mockResolvedValue(mockCurrentUser)
    mockGetRouterParam.mockReturnValue('nonexistent')

    mockDb.select.mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    }))

    const handler = await import('~~/server/api/budget/user/[username].get')

    await expect(handler.default(mockEvent)).rejects.toThrow('User not found')
  })

  it('should reject access when no sharing permission exists', async () => {
    const mockEvent = {} as H3Event
    const mockCurrentUser = { id: 'user-123' }
    const mockTargetUser = { id: 'user-456', username: 'targetuser' }

    mockGetUserFromRequest.mockResolvedValue(mockCurrentUser)
    mockGetRouterParam.mockReturnValue('targetuser')

    let selectCallCount = 0
    mockDb.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([mockTargetUser])
            }
            return Promise.resolve([])
          }),
        })),
      })),
    }))

    const handler = await import('~~/server/api/budget/user/[username].get')

    await expect(handler.default(mockEvent)).rejects.toThrow('Access denied')
  })

  it('should allow owner access without sharing record', async () => {
    const mockEvent = {} as H3Event
    const mockUser = { id: 'user-123', username: 'testuser', mainCurrency: 'USD' }
    const mockMonths = [{ id: 'month-1', year: 2024, month: 0 }]

    mockGetUserFromRequest.mockResolvedValue(mockUser)
    mockGetRouterParam.mockReturnValue('testuser')
    mockGetExchangeRatesForMonth.mockResolvedValue({
      rates: { USD: 1 },
      source: '2024-01-01',
    })

    let selectCallCount = 0
    mockDb.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([mockUser])
            }
            return Promise.resolve([])
          }),
          orderBy: vi.fn(() => Promise.resolve(mockMonths)),
        })),
        orderBy: vi.fn(() => Promise.resolve(mockMonths)),
      })),
    }))

    const handler = await import('~~/server/api/budget/user/[username].get')
    const result = await handler.default(mockEvent)

    expect(result.access).toBe('owner')
    expect(result.user.username).toBe('testuser')
    expect(result.months).toHaveLength(1)
  })

  it('should set correct access level for shared budget', async () => {
    const mockEvent = {} as H3Event
    const mockCurrentUser = { id: 'user-123' }
    const mockTargetUser = { id: 'user-456', username: 'targetuser', mainCurrency: 'USD' }
    const mockShareRecord = [{ access: 'write' }]
    const mockMonths = []

    mockGetUserFromRequest.mockResolvedValue(mockCurrentUser)
    mockGetRouterParam.mockReturnValue('targetuser')
    mockGetExchangeRatesForMonth.mockResolvedValue(undefined)

    let selectCallCount = 0
    mockDb.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([mockTargetUser])
            }
            if (selectCallCount === 2) {
              return Promise.resolve(mockShareRecord)
            }
            return Promise.resolve([])
          }),
          orderBy: vi.fn(() => Promise.resolve(mockMonths)),
        })),
        orderBy: vi.fn(() => Promise.resolve(mockMonths)),
      })),
    }))

    const handler = await import('~~/server/api/budget/user/[username].get')
    const result = await handler.default(mockEvent)

    expect(result.access).toBe('write')
  })
})
