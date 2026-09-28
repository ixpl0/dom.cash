import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { deleteImage } from '~~/server/services/docs/images'
import type { DocDocument } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event): Promise<DocDocument> => {
  const currentUser = await requireAuth(event)
  const imageId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  return deleteImage(currentUser, imageId, event)
})
