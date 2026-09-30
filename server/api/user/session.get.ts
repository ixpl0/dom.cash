import { requireAuth } from '~~/server/utils/session'

export default defineEventHandler(async (event): Promise<{ userId: string }> => {
  const { id } = await requireAuth(event)
  return { userId: id }
})
