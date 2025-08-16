import { describe, it, expect } from 'vitest'

import { CURRENCIES, filterCurrencies } from '~~/shared/utils/currencies'

describe('shared/utils/currencies', () => {
  describe('CURRENCIES', () => {
    it('should contain all major currencies', () => {
      expect(CURRENCIES.USD).toBe('Доллар США')
      expect(CURRENCIES.EUR).toBe('Евро')
      expect(CURRENCIES.RUB).toBe('Российский рубль')
      expect(CURRENCIES.GBP).toBe('Фунт стерлингов')
      expect(CURRENCIES.JPY).toBe('Японская иена')
    })

    it('should have currency codes in uppercase', () => {
      const codes = Object.keys(CURRENCIES)
      codes.forEach((code) => {
        expect(code).toBe(code.toUpperCase())
        expect(code).toMatch(/^[A-Z]{3}$/)
      })
    })

    it('should have currency names as strings', () => {
      const names = Object.values(CURRENCIES)
      names.forEach((name) => {
        expect(typeof name).toBe('string')
        expect(name.length).toBeGreaterThan(0)
      })
    })

    it('should contain more than 100 currencies', () => {
      const currencyCount = Object.keys(CURRENCIES).length
      expect(currencyCount).toBeGreaterThan(100)
    })
  })

  describe('filterCurrencies', () => {
    it('should return all currencies when query is empty', () => {
      const result = filterCurrencies('')
      expect(result.length).toBe(Object.keys(CURRENCIES).length)
    })

    it('should filter by currency code', () => {
      const result = filterCurrencies('USD')
      expect(result).toContainEqual({ code: 'USD', name: 'Доллар США' })
    })

    it('should filter by currency code case insensitive', () => {
      const result = filterCurrencies('usd')
      expect(result).toContainEqual({ code: 'USD', name: 'Доллар США' })
    })

    it('should filter by currency name', () => {
      const result = filterCurrencies('Доллар')
      expect(result.some(currency => currency.name.includes('Доллар'))).toBe(true)
    })

    it('should filter by partial currency name', () => {
      const result = filterCurrencies('евро')
      expect(result).toContainEqual({ code: 'EUR', name: 'Евро' })
    })

    it('should filter by partial currency code', () => {
      const result = filterCurrencies('US')
      expect(result).toContainEqual({ code: 'USD', name: 'Доллар США' })
    })

    it('should be case insensitive for names', () => {
      const result = filterCurrencies('ЕВРО')
      expect(result).toContainEqual({ code: 'EUR', name: 'Евро' })
    })

    it('should return empty array for non-existent query', () => {
      const result = filterCurrencies('NONEXISTENT')
      expect(result).toEqual([])
    })

    it('should handle special characters in query', () => {
      const result = filterCurrencies('рубль')
      expect(result).toContainEqual({ code: 'RUB', name: 'Российский рубль' })
    })

    it('should return all matching results without limit', () => {
      const result = filterCurrencies('a')
      expect(result.length).toBeGreaterThan(10)
    })

    it('should return results in consistent order', () => {
      const result1 = filterCurrencies('US')
      const result2 = filterCurrencies('US')
      expect(result1).toEqual(result2)
    })

    it('should prioritize exact code matches', () => {
      const result = filterCurrencies('EUR')
      expect(result[0]).toEqual({ code: 'EUR', name: 'Евро' })
    })

    it('should handle whitespace in query', () => {
      const result = filterCurrencies('  USD  ')
      expect(result).toContainEqual({ code: 'USD', name: 'Доллар США' })
    })
  })
})
