import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(64)
  .regex(
    /^[a-z0-9]([a-z0-9+._-]*[a-z0-9])?@[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/,
    'Invalid email format',
  )

const passwordSchema = z.string().min(8).max(100)

export const authSchema = z.object({
  username: emailSchema,
  password: passwordSchema,
})

export type AuthRequest = z.infer<typeof authSchema>
