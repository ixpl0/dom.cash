import { requireAuth } from '~~/server/utils/session'
import { listFolders } from '~~/server/services/docs/folders'
import type { DocFoldersData } from '~~/shared/types/docs'

export default defineEventHandler(async (event): Promise<DocFoldersData> => {
  const currentUser = await requireAuth(event)
  return { folders: await listFolders(currentUser.id, event) }
})
