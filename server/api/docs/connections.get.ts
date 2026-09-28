import { requireAuth } from '~~/server/utils/session'
import { listConnections } from '~~/server/services/connections'
import type { DocParticipant } from '~~/shared/types/docs'

export default defineEventHandler(async (event): Promise<DocParticipant[]> => {
  const currentUser = await requireAuth(event)
  return listConnections(currentUser.id, event)
})
