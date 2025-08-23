const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /credential/i,
]

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'tokenHash',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'session',
])

const maskSensitiveValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    if (value.length <= 4) return '[REDACTED]'
    return value.slice(0, 2) + '*'.repeat(Math.min(6, value.length - 4)) + value.slice(-2)
  }
  return '[REDACTED]'
}

const sanitizeObject = (obj: unknown, depth = 0): unknown => {
  if (depth > 5) return '[MAX_DEPTH]'

  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(obj))
      ? maskSensitiveValue(obj)
      : obj
  }

  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1))
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack?.split('\n').slice(0, 3).join('\n'),
    }
  }

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const keyLower = key.toLowerCase()

    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(keyLower)) {
      sanitized[key] = maskSensitiveValue(value)
    }
    else if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      sanitized[key] = maskSensitiveValue(value)
    }
    else {
      sanitized[key] = sanitizeObject(value, depth + 1)
    }
  }

  return sanitized
}

export const secureLog = {
  info: (message: string, data?: unknown) => {
    console.log(message, data ? sanitizeObject(data) : '')
  },

  warn: (message: string, data?: unknown) => {
    console.warn(message, data ? sanitizeObject(data) : '')
  },

  error: (message: string, data?: unknown) => {
    console.error(message, data ? sanitizeObject(data) : '')
  },
}

export const maskApiKey = (key: string | undefined): string => {
  if (!key) return '[NOT_SET]'
  if (key.length <= 8) return '[MASKED]'
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}
