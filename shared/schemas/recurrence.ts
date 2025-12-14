import { z } from 'zod'

export const intervalRecurrenceSchema = z.object({
  type: z.literal('interval'),
  unit: z.enum(['day', 'week', 'month', 'year']),
  value: z.number().int().min(1).max(365),
})

export const weekdaysRecurrenceSchema = z.object({
  type: z.literal('weekdays'),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
})

export const dayOfMonthRecurrenceSchema = z.object({
  type: z.literal('dayOfMonth'),
  day: z.number().int().min(1).max(31),
})

export const recurrencePatternSchema = z.discriminatedUnion('type', [
  intervalRecurrenceSchema,
  weekdaysRecurrenceSchema,
  dayOfMonthRecurrenceSchema,
])

export const dateReferenceSchema = z.enum(['planned', 'now'])
