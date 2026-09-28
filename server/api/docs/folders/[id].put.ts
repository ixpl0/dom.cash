import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { parseBody } from '~~/server/utils/validation'
import { updateFolder } from '~~/server/services/docs/folders'
import { updateDocFolderSchema } from '~~/shared/schemas/docs'
import type { DocFolderSummary } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<DocFolderSummary> => {
  const currentUser = await requireAuth(event)
  const folderId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  const payload = await parseBody(event, updateDocFolderSchema)
  return updateFolder(currentUser, folderId, payload, event)
})
