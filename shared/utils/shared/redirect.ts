const DEFAULT_REDIRECT_PATH = '/'
const PLACEHOLDER_ORIGIN = 'https://app.invalid'
const IGNORED_URL_CHARACTERS = /[\t\n\r]/g
const SCHEME_RELATIVE_START = /^[\\/]{2}/

const toAppPath = (path: unknown): string | null => {
  if (typeof path !== 'string' || !path.startsWith('/') || SCHEME_RELATIVE_START.test(path.replace(IGNORED_URL_CHARACTERS, ''))) {
    return null
  }

  try {
    const url = new URL(path, PLACEHOLDER_ORIGIN)
    const appPath = `${url.pathname}${url.search}${url.hash}`
    return url.origin === PLACEHOLDER_ORIGIN && !appPath.startsWith('//') ? appPath : null
  }
  catch {
    return null
  }
}

export const isAppPath = (path: unknown): path is string => toAppPath(path) !== null

export const sanitizeRedirectPath = (redirect: unknown): string =>
  toAppPath(redirect) ?? DEFAULT_REDIRECT_PATH
