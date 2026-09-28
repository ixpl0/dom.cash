import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { parseBody } from '~~/server/utils/validation'
import { updateDocument } from '~~/server/services/docs/documents'
import { updateDocDocumentSchema } from '~~/shared/schemas/docs'
import type { DocDocument } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<DocDocument> => {
  const currentUser = await requireAuth(event)
  const documentId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  const payload = await parseBody(event, updateDocDocumentSchema)
  return updateDocument(currentUser, documentId, payload, event)
})
