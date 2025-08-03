import { z } from 'zod'

export const updateUserSchema = z.object({
  mainCurrency: z.string().min(3).max(3),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
