import type { CurrencyCode } from './currencies'

const CURRENCY_LOCALES: Partial<Record<CurrencyCode, string>> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  RUB: 'ru-RU',
  CHF: 'de-CH',
  CAD: 'en-CA',
  AUD: 'en-AU',
  NZD: 'en-NZ',
  HKD: 'zh-HK',
  SGD: 'en-SG',
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  PLN: 'pl-PL',
  CZK: 'cs-CZ',
  HUF: 'hu-HU',
  TRY: 'tr-TR',
  MXN: 'es-MX',
  BRL: 'pt-BR',
  ARS: 'es-AR',
  CLP: 'es-CL',
  COP: 'es-CO',
  PEN: 'es-PE',
  INR: 'en-IN',
  IDR: 'id-ID',
  MYR: 'ms-MY',
  PHP: 'en-PH',
  THB: 'th-TH',
  VND: 'vi-VN',
  KRW: 'ko-KR',
  TWD: 'zh-TW',
  ZAR: 'en-ZA',
  ILS: 'he-IL',
  AED: 'ar-AE',
  SAR: 'ar-SA',
  EGP: 'ar-EG',
  UAH: 'uk-UA',
  KZT: 'ru-KZ',
  BYN: 'ru-BY',
  GEL: 'ka-GE',
  AMD: 'hy-AM',
  AZN: 'az-AZ',
  UZS: 'uz-UZ',
  KGS: 'ru-KG',
  TJS: 'ru-TJ',
  RON: 'ro-RO',
  BGN: 'bg-BG',
  HRK: 'hr-HR',
  RSD: 'sr-RS',
  ISK: 'is-IS',
  AFN: 'fa-AF',
  ALL: 'sq-AL',
  ANG: 'nl-CW',
  AOA: 'pt-AO',
  AWG: 'nl-AW',
  BAM: 'bs-BA',
  BBD: 'en-BB',
  BDT: 'bn-BD',
  BHD: 'ar-BH',
  BIF: 'fr-BI',
  BMD: 'en-BM',
  BND: 'ms-BN',
  BOB: 'es-BO',
  BSD: 'en-BS',
  BTN: 'dz-BT',
  BWP: 'en-BW',
  BZD: 'en-BZ',
  CDF: 'fr-CD',
  CRC: 'es-CR',
  CUP: 'es-CU',
  CVE: 'pt-CV',
  DJF: 'fr-DJ',
  DOP: 'es-DO',
  DZD: 'ar-DZ',
  ERN: 'ti-ER',
  ETB: 'am-ET',
  FJD: 'en-FJ',
  GHS: 'en-GH',
  GMD: 'en-GM',
  GNF: 'fr-GN',
  GTQ: 'es-GT',
  GYD: 'en-GY',
  HNL: 'es-HN',
  HTG: 'fr-HT',
  IQD: 'ar-IQ',
  IRR: 'fa-IR',
  JMD: 'en-JM',
  JOD: 'ar-JO',
  KES: 'sw-KE',
  KHR: 'km-KH',
  KMF: 'ar-KM',
  KWD: 'ar-KW',
  KYD: 'en-KY',
  LAK: 'lo-LA',
  LBP: 'ar-LB',
  LKR: 'si-LK',
  LRD: 'en-LR',
  LSL: 'en-LS',
  LYD: 'ar-LY',
  MAD: 'ar-MA',
  MDL: 'ro-MD',
  MGA: 'mg-MG',
  MKD: 'mk-MK',
  MMK: 'my-MM',
  MNT: 'mn-MN',
  MOP: 'zh-MO',
  MRU: 'ar-MR',
  MUR: 'en-MU',
  MVR: 'dv-MV',
  MWK: 'en-MW',
  MZN: 'pt-MZ',
  NAD: 'en-NA',
  NGN: 'en-NG',
  NIO: 'es-NI',
  NPR: 'ne-NP',
  OMR: 'ar-OM',
  PAB: 'es-PA',
  PGK: 'en-PG',
  PKR: 'ur-PK',
  PYG: 'es-PY',
  QAR: 'ar-QA',
  RWF: 'rw-RW',
  SBD: 'en-SB',
  SCR: 'en-SC',
  SDG: 'ar-SD',
  SOS: 'so-SO',
  SRD: 'nl-SR',
  SYP: 'ar-SY',
  SZL: 'en-SZ',
  TND: 'ar-TN',
  TOP: 'to-TO',
  TTD: 'en-TT',
  TZS: 'sw-TZ',
  UGX: 'sw-UG',
  UYU: 'es-UY',
  VES: 'es-VE',
  VUV: 'en-VU',
  WST: 'en-WS',
  XAF: 'fr-CM',
  XCD: 'en-AG',
  XOF: 'fr-SN',
  XPF: 'fr-PF',
  YER: 'ar-YE',
  ZMW: 'en-ZM',
  ZWL: 'en-ZW',
}

const DEFAULT_LOCALE = 'en-US'

const getLocaleForCurrency = (currency: string): string => {
  return CURRENCY_LOCALES[currency as CurrencyCode] ?? DEFAULT_LOCALE
}

type FormatterCacheKey = `${string}-${string}-${number}-${number}`

const formatterCache = new Map<FormatterCacheKey, Intl.NumberFormat>()

const getFormatter = (
  locale: string,
  currency: string,
  minFractionDigits: number,
  maxFractionDigits: number,
): Intl.NumberFormat => {
  const key: FormatterCacheKey = `${locale}-${currency}-${minFractionDigits}-${maxFractionDigits}`
  const cached = formatterCache.get(key)

  if (cached) {
    return cached
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  })

  formatterCache.set(key, formatter)
  return formatter
}

export const formatCurrency = (
  amount: number,
  currency: string,
  options?: { rounded?: boolean },
): string => {
  const locale = getLocaleForCurrency(currency)
  const minFraction = 0
  const maxFraction = options?.rounded ? 0 : 2
  const value = options?.rounded ? Math.round(amount) : amount

  const formatter = getFormatter(locale, currency, minFraction, maxFraction)
  return formatter.format(value)
}

export const formatCurrencyRounded = (amount: number, currency: string): string => {
  return formatCurrency(amount, currency, { rounded: true })
}

const numberFormatterCache = new Map<string, Intl.NumberFormat>()

const getNumberFormatter = (locale: string, maxFractionDigits: number): Intl.NumberFormat => {
  const key = `${locale}-${maxFractionDigits}`
  const cached = numberFormatterCache.get(key)

  if (cached) {
    return cached
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  })

  numberFormatterCache.set(key, formatter)
  return formatter
}

export const formatNumber = (
  amount: number,
  currency?: string,
  options?: { maxFractionDigits?: number },
): string => {
  const locale = currency ? getLocaleForCurrency(currency) : DEFAULT_LOCALE
  const maxFraction = options?.maxFractionDigits ?? 2

  const formatter = getNumberFormatter(locale, maxFraction)
  return formatter.format(amount)
}
