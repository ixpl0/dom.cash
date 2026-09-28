import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { getFolderDetails } from '~~/server/services/docs/folders'
import type { DocFolderDetails } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<DocFolderDetails> => {
  const currentUser = await requireAuth(event)
  const folderId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  return getFolderDetails(currentUser, folderId, event)
})
