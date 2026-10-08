import { useDatabase } from '~~/server/db'
import { getPushPublicKey, savePushDevice } from '~~/server/services/push'
import { requireAuthSession } from '~~/server/utils/session'
import { parseBody } from '~~/server/utils/validation'
import { pushDeviceSchema } from '~~/shared/schemas/push'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event) => {
  const authSession = await requireAuthSession(event)
  const device = await parseBody(event, pushDeviceSchema)

  if (!getPushPublicKey()) {
    throw createError({ statusCode: 503, message: ERROR_KEYS.PUSH_NOT_CONFIGURED })
  }

  await savePushDevice(authSession, device, useDatabase(event), new Date())

  return { success: true }
})
