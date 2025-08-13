import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

vi.mock('~~/server/utils/rates/api', () => ({
  fetchHistoricalRates: vi.fn(),
}))

vi.mock('~~/server/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}))

vi.mock('~~/server/db/schema', () => ({
  currency: {
    date: 'date',
  },
}))

let hasRatesForCurrentMonth: () => Promise<boolean>

describe('database rates utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-02-15T10:30:00Z'))

    const database = await import('~~/server/utils/rates/database')
    hasRatesForCurrentMonth = database.hasRatesForCurrentMonth
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should check rates for first day of current month', async () => {
    const mockDb = await import('~~/server/db')
    const mockSelect = mockDb.db.select()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockSelect as any).from().where().limit.mockResolvedValue([{ rates: { USD: 1 } }])

    const result = await hasRatesForCurrentMonth()

    expect(result).toBe(true)
  })

  it('should return false when no rates exist for current month', async () => {
    const mockDb = await import('~~/server/db')
    const mockSelect = mockDb.db.select()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockSelect as any).from().where().limit.mockResolvedValue([])

    const result = await hasRatesForCurrentMonth()

    expect(result).toBe(false)
  })
})
