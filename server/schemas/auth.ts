import { z } from 'zod'

export const authSchema = z.object({
  username: z.string().min(3).max(64).trim(),
  password: z.string().min(8).max(100),
  mainCurrency: z.string().transform(v => v.toUpperCase()).refine(v => /^[A-Z]{3}$/.test(v), 'Invalid currency').default('USD'),
})

export type AuthRequest = z.infer<typeof authSchema>
