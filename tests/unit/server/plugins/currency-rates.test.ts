import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

// Stub Nitro's global helper for unit tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).defineNitroPlugin = (fn: any) => fn

vi.mock('~~/server/utils/rates/database', () => ({
  hasRatesForCurrentMonth: vi.fn(),
  saveHistoricalRatesForCurrentMonth: vi.fn(),
}))

let updateCurrencyRates: () => Promise<void>
let hasRatesForCurrentMonth: ReturnType<typeof vi.fn>
let saveHistoricalRatesForCurrentMonth: ReturnType<typeof vi.fn>

describe('server/plugins/currency-rates', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const database = await import('~~/server/utils/rates/database')
    hasRatesForCurrentMonth = database.hasRatesForCurrentMonth as ReturnType<typeof vi.fn>
    saveHistoricalRatesForCurrentMonth = database.saveHistoricalRatesForCurrentMonth as ReturnType<typeof vi.fn>

    const plugin = await import('~~/server/plugins/currency-rates')
    updateCurrencyRates = plugin.__testables__.updateCurrencyRates
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should skip update if rates for current month already exist', async () => {
    hasRatesForCurrentMonth.mockResolvedValue(true)

    await updateCurrencyRates()

    expect(hasRatesForCurrentMonth).toHaveBeenCalledOnce()
    expect(saveHistoricalRatesForCurrentMonth).not.toHaveBeenCalled()
  })

  it('should update rates if rates for current month do not exist', async () => {
    hasRatesForCurrentMonth.mockResolvedValue(false)
    saveHistoricalRatesForCurrentMonth.mockResolvedValue(undefined)

    await updateCurrencyRates()

    expect(hasRatesForCurrentMonth).toHaveBeenCalledOnce()
    expect(saveHistoricalRatesForCurrentMonth).toHaveBeenCalledOnce()
  })

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    hasRatesForCurrentMonth.mockRejectedValue(new Error('Database error'))

    await updateCurrencyRates()

    expect(consoleSpy).toHaveBeenCalledWith('Failed to update currency rates:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})
