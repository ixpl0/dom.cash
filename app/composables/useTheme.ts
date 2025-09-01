export const DAISY_THEMES = [
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
  'dim',
  'nord',
  'sunset',
  'caramellatte',
  'abyss',
  'silk',
]

const THEME_KEY = 'theme'
const AUTO = 'auto'
const DEFAULT_SELECTION = AUTO

export function useTheme() {
  const currentTheme = useState<string>('theme.current', () => DEFAULT_SELECTION)

  const setTheme = (theme: string) => {
    if (theme === AUTO) {
      currentTheme.value = AUTO
      if (import.meta.client) {
        try {
          document.documentElement.removeAttribute('data-theme')
          if (document.body) document.body.removeAttribute('data-theme')
          localStorage.removeItem(THEME_KEY)
          document.cookie = `theme=; Path=/; Max-Age=0; SameSite=Lax`
        }
        // eslint-disable-next-line no-empty
        catch {}
      }
      return
    }

    const next = DAISY_THEMES.includes(theme) ? theme : 'light'
    currentTheme.value = next
    if (import.meta.client) {
      try {
        document.documentElement.setAttribute('data-theme', next)
        if (document.body) document.body.setAttribute('data-theme', next)
        localStorage.setItem(THEME_KEY, next)
        const isHttps = typeof location !== 'undefined' && location.protocol === 'https:'
        document.cookie = `theme=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax${isHttps ? '; Secure' : ''}`
      }
      // eslint-disable-next-line no-empty
      catch {}
    }
  }

  const initTheme = () => {
    if (!import.meta.client) return
    try {
      const saved = localStorage.getItem(THEME_KEY) || getCookie('theme')
      if (saved && saved !== AUTO) setTheme(saved)
      else setTheme(AUTO)
    }
    catch {
      setTheme(AUTO)
    }
  }

  const getCookie = (name: string): string | null => {
    try {
      const prefix = name + '='
      const match = document.cookie
        .split('; ')
        .find(row => row.startsWith(prefix))
      if (!match) return null
      const value = match.slice(prefix.length)
      return value ? decodeURIComponent(value) : null
    }
    catch {
      return null
    }
  }

  return {
    themes: DAISY_THEMES,
    currentTheme,
    setTheme,
    initTheme,
  }
}
