import { vi } from 'vitest'

export const createMockDatabase = () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
  }

  const mockCurrency = {
    date: 'currency.date',
  }

  const mockEq = vi.fn()

  // Мок для insert операций
  const createInsertChain = () => {
    const values = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    })

    mockDb.insert.mockReturnValue({
      values,
    })

    return { values }
  }

  // Мок для select операций
  const createSelectChain = (result: unknown[] = []) => {
    const from = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    })

    mockDb.select.mockReturnValue({
      from,
    })

    return { from }
  }

  return {
    mockDb,
    mockCurrency,
    mockEq,
    createInsertChain,
    createSelectChain,

    // Настройки для разных сценариев
    setupSuccessfulInsert: () => {
      createInsertChain()
    },

    setupSuccessfulSelect: (result: unknown[] = []) => {
      createSelectChain(result)
    },

    setupEmptySelect: () => {
      createSelectChain([])
    },

    reset: () => {
      mockDb.insert.mockReset()
      mockDb.select.mockReset()
      mockEq.mockReset()
    },
  }
}
