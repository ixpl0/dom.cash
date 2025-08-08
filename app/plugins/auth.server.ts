import { getCookie } from 'h3'
import { createHash } from 'node:crypto'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '~~/server/db'
import { user, session } from '~~/server/db/schema'

export default defineNuxtPlugin(async () => {
  const event = useRequestEvent()
  if (!event) return

  const token = getCookie(event, 'auth-token')
  if (!token) return

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const now = new Date()

    const [userRecord] = await db
      .select({
        id: user.id,
        username: user.username,
        mainCurrency: user.mainCurrency,
      })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(and(
        eq(session.tokenHash, tokenHash),
        gt(session.expiresAt, now),
      ))
      .limit(1)

    if (userRecord) {
      const userState = useState('auth.user')
      userState.value = userRecord
    }
  }
  catch {}
})
