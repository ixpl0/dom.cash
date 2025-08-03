import { eq } from 'drizzle-orm'
import { authSchema } from '~~/server/schemas/auth'
import { hashPassword, verifyPassword, generateToken, generateId } from '~~/server/utils/auth'
import { db } from '~~/server/db'
import { user, session } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = authSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Неверные данные',
      data: result.error.errors,
    })
  }

  const { username, password } = result.data

  const existingUser = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  let userId: string
  let isNewUser = false

  if (existingUser.length > 0) {
    const currentUser = existingUser[0]
    const isPasswordValid = await verifyPassword(password, currentUser.passwordHash)

    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Неверный пароль',
      })
    }

    userId = currentUser.id
  }
  else {
    userId = generateId()
    const passwordHash = await hashPassword(password)
    isNewUser = true

    try {
      await db.insert(user).values({
        id: userId,
        username,
        passwordHash,
        mainCurrency: 'USD',
      })
    }
    catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Ошибка создания пользователя',
      })
    }
  }

  await db.delete(session).where(eq(session.userId, userId))

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  console.log('[login API] Saving session with token:', token)

  await db.insert(session).values({
    id: generateId(),
    userId,
    token,
    expiresAt,
  })

  return {
    success: true,
    token,
    isNewUser,
    user: {
      id: userId,
      username,
    },
  }
})
