import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { parseBody } from '~~/server/utils/validation'
import { readRecognitionLanguage, recognizeDocument } from '~~/server/services/docs/recognition'
import { recognizeDocDocumentSchema } from '~~/shared/schemas/docs'
import type { DocRecognitionResult } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<DocRecognitionResult> => {
  const currentUser = await requireAuth(event)
  const documentId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  const payload = await parseBody(event, recognizeDocDocumentSchema)
  return recognizeDocument(currentUser, documentId, payload, readRecognitionLanguage(event), event)
})
