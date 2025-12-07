export const COOKIE_NAMES = {
  theme: 'theme',
  faviconColors: 'favicon-colors',
  userPreferences: 'user-preferences',
} as const

export const UI_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
} as const
