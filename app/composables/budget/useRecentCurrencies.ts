import { ref, readonly } from 'vue'

const STORAGE_KEY = 'recent_currencies'
const MAX_RECENT_CURRENCIES = 8

const recentCurrencies = ref<string[]>([])

const loadRecentCurrencies = () => {
  if (!import.meta.client) {
    return
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        recentCurrencies.value = parsed.slice(0, MAX_RECENT_CURRENCIES)
      }
    }
  }
  catch {
    recentCurrencies.value = []
  }
}

const saveRecentCurrencies = () => {
  if (!import.meta.client) {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentCurrencies.value))
  }
  catch (error) {
    console.error('Failed to save recent currencies:', error)
  }
}

export const useRecentCurrencies = () => {
  const addRecentCurrency = (currencyCode: string) => {
    recentCurrencies.value = [currencyCode, ...recentCurrencies.value.filter(code => code !== currencyCode)]
      .slice(0, MAX_RECENT_CURRENCIES)
    saveRecentCurrencies()
  }

  const getRecentCurrencies = () => {
    return readonly(recentCurrencies)
  }

  if (recentCurrencies.value.length === 0) {
    loadRecentCurrencies()
  }

  return {
    addRecentCurrency,
    getRecentCurrencies,
  }
}
