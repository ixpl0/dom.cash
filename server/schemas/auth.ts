import { z } from 'zod'

export const authSchema = z.object({
  username: z.string().min(3).max(64).trim(),
  password: z.string().min(8).max(100),
}).transform(data => ({ ...data, mainCurrency: 'USD' }))

export type AuthRequest = z.infer<typeof authSchema>
