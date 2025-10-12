export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  if ('data' in error) {
    const data = (error as { data?: unknown }).data

    if (data && typeof data === 'object' && 'message' in data && (data as { message?: unknown }).message) {
      return String((data as { message: unknown }).message)
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  if ('message' in error && (error as { message?: unknown }).message) {
    return String((error as { message: unknown }).message)
  }

  if ('statusMessage' in error && typeof (error as { statusMessage?: unknown }).statusMessage === 'string') {
    return (error as { statusMessage: string }).statusMessage
  }

  return fallback
}
