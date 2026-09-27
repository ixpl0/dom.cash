import { readServerErrorKey } from '~/utils/server-error'

export const useServerError = () => {
  const { t } = useI18n()

  const formatError = (error: unknown, fallback: string): string => {
    const errorKey = readServerErrorKey(error)
    return errorKey ? t(errorKey) : fallback
  }

  return { formatError }
}
