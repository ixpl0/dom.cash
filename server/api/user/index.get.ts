import { eq } from 'drizzle-orm'
import { getCurrentUser } from '~~/server/utils/user'
import { db } from '~~/server/db'
import { user } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const currentUser = await getCurrentUser(event)

  const userData = await db
    .select({
      id: user.id,
      username: user.username,
      mainCurrency: user.mainCurrency,
    })
    .from(user)
    .where(eq(user.id, currentUser.userId))
    .limit(1)

  if (!userData.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Пользователь не найден',
    })
  }

  const userInfo = userData[0]

  return {
    success: true,
    user: {
      id: userInfo.id,
      username: userInfo.username,
      mainCurrency: userInfo.mainCurrency,
    },
  }
})
