import { beforeEach, describe, expect, it, vi, afterEach, beforeAll, afterAll } from 'vitest'

(globalThis as any).defineNitroPlugin = (fn: any) => fn

vi.mock('~~/server/utils/rates/database', () => ({
  hasRatesForCurrentMonth: vi.fn(),
  saveHistoricalRatesForCurrentMonth: vi.fn(),
}))

vi.mock('cron', () => ({
  CronJob: vi.fn(),
}))

const originalConsole = console
beforeAll(() => {
  global.console = {
    ...console,
    log: vi.fn(),
    error: vi.fn(),
  }
})

afterAll(() => {
  global.console = originalConsole
})

let updateCurrencyRates: () => Promise<void>
let hasRatesForCurrentMonth: ReturnType<typeof vi.fn>
let saveHistoricalRatesForCurrentMonth: ReturnType<typeof vi.fn>
let mockCronJob: ReturnType<typeof vi.fn>

describe('server/plugins/currency-rates', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const database = await import('~~/server/utils/rates/database')
    hasRatesForCurrentMonth = database.hasRatesForCurrentMonth as ReturnType<typeof vi.fn>
    saveHistoricalRatesForCurrentMonth = database.saveHistoricalRatesForCurrentMonth as ReturnType<typeof vi.fn>

    const cron = await import('cron')
    mockCronJob = cron.CronJob as unknown as ReturnType<typeof vi.fn>

    const plugin = await import('~~/server/plugins/currency-rates')
    updateCurrencyRates = plugin.__testables__.updateCurrencyRates
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should log that update is disabled', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await updateCurrencyRates()

    expect(consoleSpy).toHaveBeenCalledWith('Currency rates auto-update is disabled in D1 plugin context')
    consoleSpy.mockRestore()
  })

  it('should not call database functions', async () => {
    await updateCurrencyRates()

    expect(hasRatesForCurrentMonth).not.toHaveBeenCalled()
    expect(saveHistoricalRatesForCurrentMonth).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const originalLog = console.log
    console.log = vi.fn(() => {
      throw new Error('Logging error')
    })

    await updateCurrencyRates()

    expect(consoleSpy).toHaveBeenCalledWith('Failed to update currency rates:', expect.any(Error))
    consoleSpy.mockRestore()
    console.log = originalLog
  })

  describe('plugin integration', () => {
    it('should start scheduler when environment variable is set', async () => {
      const mockCronJobInstance = {
        start: vi.fn(),
        stop: vi.fn(),
      }

      mockCronJob.mockImplementation(() => mockCronJobInstance)

      const mockNitroApp = {
        hooks: {
          hook: vi.fn(),
        },
      }

      const originalEnv = process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE
      process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE = '1'

      try {
        vi.resetModules()
        const plugin = await import('~~/server/plugins/currency-rates?t=' + Date.now())
        plugin.default(mockNitroApp as Parameters<typeof plugin.default>[0])

        expect(mockCronJob).toHaveBeenCalledWith(
          '0 5 0 * * *',
          expect.any(Function),
          null,
          false,
          'UTC',
        )
        expect(mockCronJobInstance.start).toHaveBeenCalled()
        expect(mockNitroApp.hooks.hook).toHaveBeenCalledWith('close', expect.any(Function))
      }
      finally {
        if (originalEnv !== undefined) {
          process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE = originalEnv
        }
        else {
          delete process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE
        }
      }
    })

    it('should not start scheduler when environment variable is not set', async () => {
      const mockNitroApp = {
        hooks: {
          hook: vi.fn(),
        },
      }

      const originalEnv = process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE
      delete process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE

      try {
        vi.resetModules()
        const plugin = await import('~~/server/plugins/currency-rates?t=' + Date.now())
        plugin.default(mockNitroApp as Parameters<typeof plugin.default>[0])

        expect(mockCronJob).not.toHaveBeenCalled()
        expect(mockNitroApp.hooks.hook).not.toHaveBeenCalled()
      }
      finally {
        if (originalEnv !== undefined) {
          process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE = originalEnv
        }
      }
    })

    it('should stop scheduler on nitro close hook', async () => {
      const mockCronJobInstance = {
        start: vi.fn(),
        stop: vi.fn(),
      }

      mockCronJob.mockImplementation(() => mockCronJobInstance)

      const mockNitroApp = {
        hooks: {
          hook: vi.fn(),
        },
      }

      const originalEnv = process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE
      process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE = '1'

      try {
        vi.resetModules()
        const plugin = await import('~~/server/plugins/currency-rates?t=' + Date.now())
        plugin.default(mockNitroApp as Parameters<typeof plugin.default>[0])

        expect(mockNitroApp.hooks.hook).toHaveBeenCalledWith('close', expect.any(Function))
        const closeCallback = mockNitroApp.hooks.hook.mock.calls[0][1]

        closeCallback()

        expect(mockCronJobInstance.stop).toHaveBeenCalled()
      }
      finally {
        if (originalEnv !== undefined) {
          process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE = originalEnv
        }
        else {
          delete process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE
        }
      }
    })

    it('should not start scheduler twice if already started', async () => {
      const mockCronJobInstance = {
        start: vi.fn(),
        stop: vi.fn(),
      }

      mockCronJob.mockImplementation(() => mockCronJobInstance)

      const mockNitroApp = {
        hooks: {
          hook: vi.fn(),
        },
      }

      const originalEnv = process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE
      process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE = '1'

      try {
        vi.resetModules()
        const plugin = await import('~~/server/plugins/currency-rates?t=' + Date.now())

        plugin.default(mockNitroApp as Parameters<typeof plugin.default>[0])
        const firstCallCount = mockCronJob.mock.calls.length

        plugin.default(mockNitroApp as Parameters<typeof plugin.default>[0])
        const secondCallCount = mockCronJob.mock.calls.length

        expect(secondCallCount).toBe(firstCallCount)
      }
      finally {
        if (originalEnv !== undefined) {
          process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE = originalEnv
        }
        else {
          delete process.env.ENABLE_CURRENCY_RATES_AUTO_UPDATE
        }
      }
    })
  })
})
