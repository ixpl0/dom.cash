import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { deleteFolder } from '~~/server/services/docs/folders'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const folderId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  await deleteFolder(currentUser, folderId, event)
  return { success: true }
})
