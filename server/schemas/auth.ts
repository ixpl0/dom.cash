import { z } from 'zod'

const usernameSchema = z.string().min(3).max(64).trim()
const passwordSchema = z.string().min(8).max(100)

export const authSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
}).transform(data => ({ ...data, mainCurrency: 'USD' }))

export type AuthRequest = z.infer<typeof authSchema>
