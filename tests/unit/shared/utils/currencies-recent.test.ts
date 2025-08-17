import { describe, it, expect } from 'vitest'
import { filterCurrencies } from '~~/shared/utils/currencies'

describe('filterCurrencies with recent currencies', () => {
  it('should return all currencies without recent list', () => {
    const result = filterCurrencies('')

    expect(result.length).toBeGreaterThan(100)
    expect(result[0].code).toBe('AED')
    expect(result.find(c => c.code === 'USD')).toBeDefined()
  })

  it('should prioritize recent currencies when no search query', () => {
    const recentCurrencies = ['USD', 'EUR', 'GBP']
    const result = filterCurrencies('', recentCurrencies)

    expect(result[0].code).toBe('USD')
    expect(result[1].code).toBe('EUR')
    expect(result[2].code).toBe('GBP')
    expect(result[3].code).toBe('AED')
  })

  it('should maintain recent order', () => {
    const recentCurrencies = ['GBP', 'USD', 'EUR']
    const result = filterCurrencies('', recentCurrencies)

    expect(result[0].code).toBe('GBP')
    expect(result[1].code).toBe('USD')
    expect(result[2].code).toBe('EUR')
  })

  it('should filter by search query and still prioritize recent', () => {
    const recentCurrencies = ['USD', 'EUR']
    const result = filterCurrencies('u', recentCurrencies)

    const usdIndex = result.findIndex(c => c.code === 'USD')
    const eurIndex = result.findIndex(c => c.code === 'EUR')
    const audIndex = result.findIndex(c => c.code === 'AUD')

    expect(usdIndex).toBeLessThan(audIndex)
    expect(eurIndex).toBeLessThan(audIndex)
  })

  it('should handle recent currencies not in filtered results', () => {
    const recentCurrencies = ['USD', 'EUR']
    const result = filterCurrencies('btc', recentCurrencies)

    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('BTC')
  })

  it('should handle empty recent currencies list', () => {
    const result = filterCurrencies('usd', [])

    expect(result.find(c => c.code === 'USD')).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })

  it('should search by currency name and prioritize recent', () => {
    const recentCurrencies = ['USD', 'EUR']
    const result = filterCurrencies('доллар', recentCurrencies)

    const usdIndex = result.findIndex(c => c.code === 'USD')
    const otherDollarIndex = result.findIndex(c => c.code === 'CAD')

    expect(usdIndex).toBeLessThan(otherDollarIndex)
  })

  it('should handle case insensitive search with recent priorities', () => {
    const recentCurrencies = ['usd', 'eur']
    const result = filterCurrencies('USD', recentCurrencies)

    expect(result[0].code).toBe('USD')
  })

  it('should filter correctly when recent currency is in middle of alphabet', () => {
    const recentCurrencies = ['JPY']
    const result = filterCurrencies('', recentCurrencies)

    expect(result[0].code).toBe('JPY')
    expect(result[1].code).toBe('AED')

    const jpyInMiddle = result.slice(1).findIndex(c => c.code === 'JPY')
    expect(jpyInMiddle).toBe(-1)
  })

  it('should handle multiple recent currencies with search', () => {
    const recentCurrencies = ['USD', 'EUR', 'GBP', 'JPY']
    const result = filterCurrencies('', recentCurrencies)

    expect(result.slice(0, 4).map(c => c.code)).toEqual(['USD', 'EUR', 'GBP', 'JPY'])
    expect(result[4].code).toBe('AED')
  })

  it('should maintain alphabetical order for non-recent currencies', () => {
    const recentCurrencies = ['USD']
    const result = filterCurrencies('', recentCurrencies)

    const nonRecentCurrencies = result.slice(1)
    const codes = nonRecentCurrencies.map(c => c.code)
    const sortedCodes = [...codes].sort()

    expect(codes).toEqual(sortedCodes)
  })
})
