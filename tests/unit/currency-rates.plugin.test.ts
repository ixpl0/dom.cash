import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

// Stub Nitro's global helper for unit tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).defineNitroPlugin = (fn: any) => fn

vi.mock('~~/server/utils/rates/scheduler', () => ({
  updateCurrentRates: vi.fn(),
  updateHistoricalRatesForCurrentMonth: vi.fn(),
  shouldUpdateRatesNow: vi.fn(),
}))

let executeScheduledTasks: () => Promise<void>
let resetState: () => void
let updateCurrentRates: ReturnType<typeof vi.fn>
let shouldUpdateRatesNow: ReturnType<typeof vi.fn>

describe('currency rates plugin scheduler', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-02-01T00:00:00Z'))

    const sched = await import('~~/server/utils/rates/scheduler')
    updateCurrentRates = sched.updateCurrentRates as ReturnType<typeof vi.fn>
    shouldUpdateRatesNow = sched.shouldUpdateRatesNow as ReturnType<typeof vi.fn>

    const plugin = await import('../../server/plugins/currency-rates')
    executeScheduledTasks = plugin.__testables__.executeScheduledTasks
    resetState = plugin.__testables__.resetState
    resetState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should stop retrying after a successful update', async () => {
    shouldUpdateRatesNow.mockReturnValue({ updateCurrent: true, updateHistorical: false })
    updateCurrentRates.mockResolvedValue()

    await executeScheduledTasks()
    await executeScheduledTasks()

    expect(updateCurrentRates).toHaveBeenCalledOnce()

    vi.setSystemTime(new Date('2025-02-02T00:00:00Z'))
    await executeScheduledTasks()

    expect(updateCurrentRates).toHaveBeenCalledTimes(2)
  })

  it('should retry up to the limit on failure', async () => {
    shouldUpdateRatesNow.mockReturnValue({ updateCurrent: true, updateHistorical: false })
    updateCurrentRates.mockRejectedValue(new Error('fail'))

    for (let i = 0; i < 5; i++) {
      await executeScheduledTasks()
      vi.setSystemTime(new Date(Date.UTC(2025, 1, 1, 0, (i + 1) * 5)))
    }

    await executeScheduledTasks()

    expect(updateCurrentRates).toHaveBeenCalledTimes(5)
  })
})
