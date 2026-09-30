import { getRequestHeader, getRequestHost, type H3Event } from 'h3'

const SAFE_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS']
const SAME_ORIGIN_FETCH_SITES: readonly string[] = ['same-origin', 'none']

export const isWriteRequest = (event: H3Event): boolean => !SAFE_METHODS.includes(event.method)

export const getRoutePath = (event: H3Event): string => event.path.split('?')[0] ?? ''

export const getMediaType = (contentType: string | undefined): string =>
  contentType?.split(';')[0]?.trim().toLowerCase() ?? ''

const readOriginHost = (origin: string): string | null => {
  try {
    return new URL(origin).host
  }
  catch {
    return null
  }
}

export const isCrossOriginRequest = (event: H3Event): boolean => {
  const fetchSite = getRequestHeader(event, 'sec-fetch-site')

  if (fetchSite) {
    return !SAME_ORIGIN_FETCH_SITES.includes(fetchSite)
  }

  const origin = getRequestHeader(event, 'origin')

  if (!origin) {
    return false
  }

  return readOriginHost(origin) !== getRequestHost(event).toLowerCase()
}
