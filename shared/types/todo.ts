import type { z } from 'zod'
import type { createTodoSchema, updateTodoSchema } from '~~/shared/schemas/todo'
import type { RecurrencePattern } from './recurrence'

export interface TodoListItem {
  id: string
  content: string
  isCompleted: boolean
  plannedDate: string | null
  recurrence: RecurrencePattern | null
  createdAt: string
  updatedAt: string
  isOwner: boolean
  ownerUsername: string
  sharedWith: Array<{ id: string, username: string }>
}

export type CreateTodoPayload = z.infer<typeof createTodoSchema>

export type UpdateTodoPayload = z.infer<typeof updateTodoSchema>

export interface TodoConnection {
  id: string
  username: string
}

export interface TodoData {
  items: TodoListItem[]
}

export interface ToggleResult {
  isCompleted: boolean
  plannedDate?: string
  isRecurring: boolean
}

export interface OverdueTodoCount {
  count: number
}
