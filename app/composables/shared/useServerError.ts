interface ErrorWithData {
  data?: {
    message?: string
    params?: Record<string, string | number>
  }
  message?: string
  statusMessage?: string
}

const extractErrorInfo = (error: unknown): { message: string, params?: Record<string, string | number> } => {
  if (!error || typeof error !== 'object') {
    return { message: '' }
  }

  const errorObj = error as ErrorWithData

  if (errorObj.data) {
    if (typeof errorObj.data === 'object' && errorObj.data.message) {
      return {
        message: String(errorObj.data.message),
        params: errorObj.data.params,
      }
    }
  }

  if (error instanceof Error && error.message) {
    return { message: error.message }
  }

  if (errorObj.message) {
    return { message: String(errorObj.message) }
  }

  if (errorObj.statusMessage) {
    return { message: String(errorObj.statusMessage) }
  }

  return { message: '' }
}

const isI18nKey = (message: string): boolean => {
  return message.startsWith('serverErrors.')
}

export const useServerError = () => {
  const { t, te } = useI18n()

  const formatError = (error: unknown, fallback: string): string => {
    const { message, params } = extractErrorInfo(error)

    if (!message) {
      return fallback
    }

    if (isI18nKey(message)) {
      if (te(message)) {
        return params ? t(message, params) : t(message)
      }
      return fallback
    }

    return message
  }

  return { formatError }
}
