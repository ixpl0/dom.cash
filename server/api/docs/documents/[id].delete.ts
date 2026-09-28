import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { deleteDocument } from '~~/server/services/docs/documents'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const documentId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  await deleteDocument(currentUser, documentId, event)
  return { success: true }
})
