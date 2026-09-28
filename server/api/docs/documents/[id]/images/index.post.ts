import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { parseQuery } from '~~/server/utils/validation'
import { addImage } from '~~/server/services/docs/images'
import { uploadDocImageQuerySchema } from '~~/shared/schemas/docs'
import type { DocImageUploadResult } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<DocImageUploadResult> => {
  const currentUser = await requireAuth(event)
  const documentId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  const query = parseQuery(event, uploadDocImageQuerySchema, ERROR_KEYS.DOCS_INVALID_UPLOAD)
  const body = await readRawBody(event, false)

  if (!body) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.DOCS_INVALID_UPLOAD,
    })
  }

  return addImage(currentUser, documentId, query, body, event)
})
