export const LOCALE_COOKIE_NAME = 'i18n_locale'

export const SUPPORTED_LOCALES = ['en', 'ru'] as const

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'

export const toSupportedLocale = (value: string | null | undefined): SupportedLocale =>
  SUPPORTED_LOCALES.find(locale => locale === value) ?? DEFAULT_LOCALE
