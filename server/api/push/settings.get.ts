import { useDatabase } from '~~/server/db'
import { getPushPublicKey, getTodoDigestSettings } from '~~/server/services/push'
import { requireAuth } from '~~/server/utils/session'
import type { PushSettingsData } from '~~/shared/types/push'

export default defineEventHandler(async (event): Promise<PushSettingsData> => {
  const currentUser = await requireAuth(event)
  return {
    publicKey: getPushPublicKey(),
    settings: await getTodoDigestSettings(currentUser.id, useDatabase(event)),
  }
})
