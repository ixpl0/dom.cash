import { createError, getRouterParam, type H3Event } from 'h3'
import type { ErrorKey } from '~~/shared/utils/shared/error-keys'

export const requireRouterParam = (event: H3Event, name: string, errorKey: ErrorKey): string => {
  const value = getRouterParam(event, name)

  if (!value) {
    throw createError({
      statusCode: 400,
      message: errorKey,
    })
  }

  return value
}
