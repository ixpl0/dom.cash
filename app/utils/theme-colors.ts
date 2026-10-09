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

export type DaisyTheme = typeof DAISY_THEMES[number]

export type ThemeColorMeta = {
  key: string
  name: 'theme-color'
  content: string
  media?: '(prefers-color-scheme: light)' | '(prefers-color-scheme: dark)'
}

export const THEME_HEADER_COLORS: Readonly<Record<DaisyTheme, string>> = {
  kekdark: '#3a3d40',
  kekdarker: '#282b2f',
  keklight: '#fff3dd',
  keklighter: '#fff9ee',
  summerhaze: '#ffe0e4',
  ritualhabitual: '#1c1c1c',
  crystalclear: '#f8fafc',
  grayscale: '#fafafa',
  grayscaledark: '#262626',
}

export const AUTO_LIGHT_THEME: DaisyTheme = 'keklighter'

export const AUTO_DARK_THEME: DaisyTheme = 'kekdarker'

export const getThemeColorMetas = (theme: DaisyTheme | undefined): ThemeColorMeta[] => {
  if (theme) {
    return [{ key: 'theme-color', name: 'theme-color', content: THEME_HEADER_COLORS[theme] }]
  }

  return [
    { key: 'theme-color-light', name: 'theme-color', media: '(prefers-color-scheme: light)', content: THEME_HEADER_COLORS[AUTO_LIGHT_THEME] },
    { key: 'theme-color-dark', name: 'theme-color', media: '(prefers-color-scheme: dark)', content: THEME_HEADER_COLORS[AUTO_DARK_THEME] },
  ]
}
