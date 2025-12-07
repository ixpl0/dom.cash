// TODO: Delete this file after 2026-03-03 (migration from localStorage to cookies)
import type { CookieRef } from 'nuxt/app'

const THEME_KEY = 'theme'

export const migrateThemeFromLocalStorage = <T>(
  themeCookie: CookieRef<T>,
  isValidTheme: (theme: unknown) => boolean,
  defaultValue: T,
) => {
  if (!import.meta.client) {
    return
  }

  if (themeCookie.value !== defaultValue) {
    return
  }

  try {
    const localStorageTheme = localStorage.getItem(THEME_KEY)

    if (localStorageTheme && isValidTheme(localStorageTheme)) {
      themeCookie.value = localStorageTheme as T
      localStorage.removeItem(THEME_KEY)
    }
  }
  catch {
    // localStorage may not be available (e.g. Safari private mode)
  }
}
