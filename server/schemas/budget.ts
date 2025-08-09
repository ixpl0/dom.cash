import { z } from 'zod'

export const createMonthSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(0).max(11),
})

export const createEntrySchema = z.object({
  monthId: z.string().uuid(),
  kind: z.enum(['balance', 'income', 'expense']),
  description: z.string().min(1),
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3),
  date: z.string().date().optional(),
})

export const updateEntrySchema = z.object({
  description: z.string().min(1),
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3),
  date: z.string().date().optional(),
})

export type CreateMonthInput = z.infer<typeof createMonthSchema>
export type CreateEntryInput = z.infer<typeof createEntrySchema>
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>

