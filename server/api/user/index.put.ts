import { eq } from 'drizzle-orm'
import { updateUserSchema } from '~~/server/schemas/user'
import { getCurrentUser } from '~~/server/utils/user'
import { db } from '~~/server/db'
import { user } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const currentUser = await getCurrentUser(event)
  const body = await readBody(event)

  const result = updateUserSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Неверные данные',
      data: result.error.errors,
    })
  }

  const { mainCurrency } = result.data

  const updatedUser = await db
    .update(user)
    .set({ mainCurrency })
    .where(eq(user.id, currentUser.userId))
    .returning({
      id: user.id,
      username: user.username,
      mainCurrency: user.mainCurrency,
    })

  if (!updatedUser.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Пользователь не найден',
    })
  }

  return {
    success: true,
    user: updatedUser[0],
  }
})
