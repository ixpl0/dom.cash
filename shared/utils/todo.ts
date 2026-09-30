import type { TodoListItem } from '~~/shared/types/todo'
import { getPlainDate } from '~~/shared/utils/shared/dates'

export const isTodoOverdue = ({ plannedDate, isCompleted }: Pick<TodoListItem, 'plannedDate' | 'isCompleted'>, today: string | null): boolean =>
  today !== null && !isCompleted && plannedDate !== null && getPlainDate(plannedDate) <= today

export const getSeenPlannedDate = ({ plannedDate }: Pick<TodoListItem, 'plannedDate'>): string | null =>
  plannedDate === null ? null : getPlainDate(plannedDate)
