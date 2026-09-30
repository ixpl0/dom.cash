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
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack?.split('\n').slice(0, 3).join('\n'),
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
