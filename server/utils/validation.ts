import { createError, type H3Event, readBody } from 'h3'
import type { ZodType, z } from 'zod'

export const parseBody = async <T extends ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> => {
  const requestBody = await readBody(event)
  const validationResult = schema.safeParse(requestBody)

  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: validationResult.error.issues.map(issue => issue.message).join('; '),
    })
  }

  return validationResult.data
}
