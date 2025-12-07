import type { FaviconColors } from '~/utils/favicon'
import { generateFaviconDataUrl } from '~/utils/favicon'
import { migrateThemeFromLocalStorage } from '~/utils/theme-migration'

export const DAISY_THEMES = [
  'kekdark',
  'kekdarker',
  'keklight',
  'keklighter',
  'summerhaze',
  'ritualhabitual',
  'crystalclear',
  'grayscale',
  'grayscaledark',
] as const

type DaisyTheme = typeof DAISY_THEMES[number]
type ThemeSelection = DaisyTheme | 'auto'

const THEME_COOKIE_NAME = 'theme'
const FAVICON_COOKIE_NAME = 'favicon-colors'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const AUTO = 'auto'

const DEFAULT_FAVICON_COLORS: FaviconColors = {
  contours: '#2c2d30',
  face: '#fff',
  cheeks: '#FF6661',
  roof: '#FF6661',
  pipe: '#A9DC76',
}

const isValidTheme = (theme: unknown): theme is DaisyTheme => {
  return typeof theme === 'string' && DAISY_THEMES.includes(theme as DaisyTheme)
}

const parseFaviconColors = (value: FaviconColors | string | null): FaviconColors => {
  if (!value) {
    return DEFAULT_FAVICON_COLORS
  }

  if (typeof value === 'object') {
    return value
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as FaviconColors
  }
  catch {
    return DEFAULT_FAVICON_COLORS
  }
}

export const useTheme = () => {
  const themeCookie = useCookie<ThemeSelection>(THEME_COOKIE_NAME, {
    maxAge: COOKIE_MAX_AGE,
    default: () => AUTO,
  })

  const faviconColorsCookie = useCookie<FaviconColors | string | null>(FAVICON_COOKIE_NAME, {
    maxAge: COOKIE_MAX_AGE,
    default: () => null,
  })

  // TODO: Remove after 2026-03-03
  migrateThemeFromLocalStorage(themeCookie, isValidTheme, AUTO)

  const validatedTheme = computed((): ThemeSelection => {
    if (themeCookie.value === AUTO) {
      return AUTO
    }
    return isValidTheme(themeCookie.value) ? themeCookie.value : AUTO
  })

  const currentTheme = computed(() => validatedTheme.value)

  const effectiveTheme = computed(() => {
    return validatedTheme.value === AUTO ? undefined : validatedTheme.value
  })

  const faviconLink = computed(() => {
    if (!effectiveTheme.value) {
      return undefined
    }

    const colors = parseFaviconColors(faviconColorsCookie.value)
    return [{
      rel: 'icon',
      type: 'image/svg+xml',
      href: generateFaviconDataUrl(colors),
    }]
  })

  useHead(computed(() => ({
    htmlAttrs: effectiveTheme.value ? { 'data-theme': effectiveTheme.value } : {},
    bodyAttrs: effectiveTheme.value ? { 'data-theme': effectiveTheme.value } : {},
    link: faviconLink.value,
  })))

  const setTheme = (theme: string) => {
    if (theme === AUTO) {
      themeCookie.value = AUTO
      return
    }

    if (isValidTheme(theme)) {
      themeCookie.value = theme
    }
  }

  return {
    themes: DAISY_THEMES,
    currentTheme,
    setTheme,
  }
}
