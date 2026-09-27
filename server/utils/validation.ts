import { createError, getQuery, type H3Event, readBody } from 'h3'
import type { ZodType, z } from 'zod'
import { ERROR_KEYS, type ErrorKey } from '~~/shared/utils/shared/error-keys'

export const validateInput = <T extends ZodType>(input: unknown, schema: T, errorKey: ErrorKey): z.infer<T> => {
  const validationResult = schema.safeParse(input)

  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      message: errorKey,
      data: {
        issues: validationResult.error.issues.map(issue => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      },
    })
  }

  return validationResult.data
}

export const parseBody = async <T extends ZodType>(
  event: H3Event,
  schema: T,
  errorKey: ErrorKey = ERROR_KEYS.VALIDATION_FAILED,
): Promise<z.infer<T>> => validateInput(await readBody(event), schema, errorKey)

export const parseQuery = <T extends ZodType>(
  event: H3Event,
  schema: T,
  errorKey: ErrorKey = ERROR_KEYS.INVALID_QUERY_PARAMETERS,
): z.infer<T> => validateInput(getQuery(event), schema, errorKey)
