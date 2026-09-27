export const COOKIE_NAMES = {
  theme: 'theme',
  faviconColors: 'favicon-colors',
  userPreferences: 'user-preferences',
  lastSharedBudget: 'lastSharedBudget',
} as const

export const UI_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
} as const
