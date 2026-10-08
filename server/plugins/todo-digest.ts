import { createDatabase } from '~~/server/db'
import { getPushSender } from '~~/server/services/push'
import { sendTodoDigests } from '~~/server/services/todo-digest'
import { secureLog } from '~~/server/utils/secure-logger'

const hasDatabaseBinding = (env: unknown): env is { DB: D1Database } =>
  typeof env === 'object' && env !== null && 'DB' in env

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', async ({ env }) => {
    const now = new Date()
    const send = getPushSender(now)

    if (!send || !hasDatabaseBinding(env)) {
      return
    }

    try {
      const result = await sendTodoDigests(createDatabase(env.DB), now, send)

      if (result.userCount > 0) {
        secureLog.info('Todo digests sent', result)
      }
    }
    catch (error) {
      secureLog.error('Failed to send todo digests:', error)
    }
  })
})
