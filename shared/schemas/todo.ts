import { z } from 'zod'
import { recurrencePatternSchema } from '~~/shared/schemas/recurrence'

export const TODO_CONTENT_MAX_LENGTH = 10000
export const TODO_MAX_SHARED_USERS = 50

export const todoContentSchema = z.string().trim().min(1).max(TODO_CONTENT_MAX_LENGTH)

export const plannedDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)

const sharedWithUserIdsSchema = z.array(z.string()).max(TODO_MAX_SHARED_USERS)

export const todoFormSchema = z.object({
  content: todoContentSchema,
  recurrence: recurrencePatternSchema.nullable(),
})

export const createTodoSchema = z.object({
  content: todoContentSchema,
  plannedDate: plannedDateSchema.optional(),
  recurrence: recurrencePatternSchema.nullable().optional(),
  sharedWithUserIds: sharedWithUserIdsSchema.optional(),
})

export const todoCompletionSchema = z.object({
  isCompleted: z.boolean(),
  plannedDate: z.iso.date().nullable(),
})

export const todoPlannedDateSchema = z.object({
  plannedDate: z.iso.date().nullable(),
  newPlannedDate: z.iso.date(),
})

export const updateTodoSchema = z.object({
  content: todoContentSchema.optional(),
  plannedDate: plannedDateSchema.nullable().optional(),
  recurrence: recurrencePatternSchema.nullable().optional(),
  sharedWithUserIds: sharedWithUserIdsSchema.optional(),
})
