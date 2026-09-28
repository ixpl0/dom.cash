import { requireAuth } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { createFolder } from '~~/server/services/docs/folders'
import { createDocFolderSchema } from '~~/shared/schemas/docs'
import type { DocFolderSummary } from '~~/shared/types/docs'

export default defineEventHandler(async (event): Promise<DocFolderSummary> => {
  const currentUser = await requireAuth(event)
  const payload = await parseBody(event, createDocFolderSchema)
  return createFolder(currentUser, payload, event)
})
