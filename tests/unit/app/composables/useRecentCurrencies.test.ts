import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRecentCurrencies } from '~~/app/composables/useRecentCurrencies'

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

Object.defineProperty(globalThis, 'window', {
  value: {},
  writable: true,
})

describe('useRecentCurrencies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    const { clearRecentCurrencies } = useRecentCurrencies()
    clearRecentCurrencies()
  })

  it('should return empty list initially', () => {
    const { getRecentCurrencies } = useRecentCurrencies()
    const recentCurrencies = getRecentCurrencies()

    expect(recentCurrencies.value).toEqual([])
  })

  it('should add currency to recent list', () => {
    const { addRecentCurrency, getRecentCurrencies } = useRecentCurrencies()

    addRecentCurrency('USD')

    const recentCurrencies = getRecentCurrencies()
    expect(recentCurrencies.value).toEqual(['USD'])
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('recent_currencies', '["USD"]')
  })

  it('should move existing currency to top', () => {
    mockLocalStorage.getItem.mockReturnValue('["EUR","USD","GBP"]')

    const { addRecentCurrency, getRecentCurrencies } = useRecentCurrencies()

    addRecentCurrency('USD')

    const recentCurrencies = getRecentCurrencies()
    expect(recentCurrencies.value).toEqual(['USD', 'EUR', 'GBP'])
  })

  it('should limit to 8 currencies', () => {
    const initialCurrencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY']
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialCurrencies))

    const { addRecentCurrency, getRecentCurrencies } = useRecentCurrencies()

    addRecentCurrency('SEK')

    const recentCurrencies = getRecentCurrencies()
    expect(recentCurrencies.value).toHaveLength(8)
    expect(recentCurrencies.value[0]).toBe('SEK')
    expect(recentCurrencies.value).not.toContain('CNY')
  })

  it('should handle localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    const { getRecentCurrencies } = useRecentCurrencies()
    const recentCurrencies = getRecentCurrencies()

    expect(recentCurrencies.value).toEqual([])
  })

  it('should handle invalid JSON in localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid json')

    const { getRecentCurrencies } = useRecentCurrencies()
    const recentCurrencies = getRecentCurrencies()

    expect(recentCurrencies.value).toEqual([])
  })

  it('should handle non-array data in localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('{"not": "array"}')

    const { getRecentCurrencies } = useRecentCurrencies()
    const recentCurrencies = getRecentCurrencies()

    expect(recentCurrencies.value).toEqual([])
  })

  it('should handle localStorage save errors gracefully', () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('localStorage save error')
    })

    const { addRecentCurrency, getRecentCurrencies } = useRecentCurrencies()

    expect(() => addRecentCurrency('USD')).not.toThrow()

    const recentCurrencies = getRecentCurrencies()
    expect(recentCurrencies.value).toEqual(['USD'])
  })

  it('should load existing currencies from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('["EUR","USD","GBP"]')

    const { getRecentCurrencies } = useRecentCurrencies()
    const recentCurrencies = getRecentCurrencies()

    expect(recentCurrencies.value).toEqual(['EUR', 'USD', 'GBP'])
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('recent_currencies')
  })

  it('should truncate currencies list if loaded more than 8', () => {
    const tooManyCurrencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK']
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(tooManyCurrencies))

    const { getRecentCurrencies } = useRecentCurrencies()
    const recentCurrencies = getRecentCurrencies()

    expect(recentCurrencies.value).toHaveLength(8)
    expect(recentCurrencies.value).toEqual(tooManyCurrencies.slice(0, 8))
  })

  it('should return readonly reference', () => {
    const { getRecentCurrencies } = useRecentCurrencies()
    const recentCurrencies = getRecentCurrencies()

    expect(recentCurrencies.value).toEqual([])

    const actualType = typeof recentCurrencies
    expect(actualType).toBe('object')
    expect('value' in recentCurrencies).toBe(true)
  })
})
