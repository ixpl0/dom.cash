import { secureLog, maskApiKey } from '~~/server/utils/secure-logger'

interface ExchangeRatesResponse {
  disclaimer: string
  license: string
  timestamp: number
  base: string
  rates: Record<string, number>
}

const OPENEXCHANGERATES_API_URL = 'https://openexchangerates.org/api'

const getApiKey = (): string => {
  const apiKey = process.env.OPENEXCHANGERATES_APP_ID
  if (!apiKey) {
    secureLog.error('OPENEXCHANGERATES_APP_ID environment variable is required')
    throw new Error('API key not configured')
  }
  secureLog.info(`Using API key: ${maskApiKey(apiKey)}`)
  return apiKey
}

const fetchRatesFromApi = async (url: string): Promise<Record<string, number>> => {
  const apiKey = getApiKey()
  const fullUrl = `${url}?app_id=${apiKey}`

  const response = await fetch(fullUrl)

  if (!response.ok) {
    throw new Error(`OpenExchangeRates API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as ExchangeRatesResponse
  return data.rates
}

export const fetchHistoricalRates = async (date: string): Promise<Record<string, number>> => {
  return fetchRatesFromApi(`${OPENEXCHANGERATES_API_URL}/historical/${date}.json`)
}
