import { DrizzleQueryError } from 'drizzle-orm'

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[-_]?key/i,
  /authorization/i,
  /cookie/i,
  /credential/i,
  /^session$/i,
]

const isSensitiveKey = (key: string): boolean => SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key))

const REDACTED = '[REDACTED]'

const MAX_CAUSE_DEPTH = 5

const describeQueryError = (error: DrizzleQueryError): string => {
  const reason = error.cause instanceof Error ? `\nreason: ${error.cause.message}` : ''
  return `Failed query: ${error.query}${reason}`
}

const hideQueryParams = (error: DrizzleQueryError): { message: string, stack: string | undefined } => {
  const message = describeQueryError(error)
  return { message, stack: error.stack?.replace(error.message, message) }
}

export const redactQueryErrors = (error: unknown, depth = 0): void => {
  if (!(error instanceof Error) || depth > MAX_CAUSE_DEPTH) {
    return
  }
  const queryError = error.cause instanceof DrizzleQueryError ? error.cause : null
  if (error instanceof DrizzleQueryError) {
    const { message, stack } = hideQueryParams(error)
    Object.defineProperty(error, 'message', { value: message, configurable: true, writable: true })
    Object.defineProperty(error, 'stack', { value: stack, configurable: true, writable: true })
  }
  else if (queryError && error.message === queryError.message) {
    Object.defineProperty(error, 'message', { value: describeQueryError(queryError), configurable: true, writable: true })
  }
  redactQueryErrors(error.cause, depth + 1)
}

export const sanitizeLogData = (obj: unknown, depth = 0): unknown => {
  if (depth > 5) {
    return '[MAX_DEPTH]'
  }

  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogData(item, depth + 1))
  }

  if (obj instanceof Error) {
    const { message, stack } = obj instanceof DrizzleQueryError ? hideQueryParams(obj) : obj
    return {
      name: obj.name,
      message,
      stack: stack?.split('\n').slice(0, 3).join('\n'),
    }
  }

  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [
    key,
    isSensitiveKey(key) ? REDACTED : sanitizeLogData(value, depth + 1),
  ]))
}

export const secureLog = {
  info: (message: string, data?: unknown) => {
    console.log(message, data ? sanitizeLogData(data) : '')
  },

  warn: (message: string, data?: unknown) => {
    console.warn(message, data ? sanitizeLogData(data) : '')
  },

  error: (message: string, data?: unknown) => {
    console.error(message, data ? sanitizeLogData(data) : '')
  },
}
