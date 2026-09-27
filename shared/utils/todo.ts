import type { TodoListItem } from '~~/shared/types/todo'
import { getPlainDate } from '~~/shared/utils/shared/dates'

export const isTodoOverdue = ({ plannedDate, isCompleted }: Pick<TodoListItem, 'plannedDate' | 'isCompleted'>, today: string): boolean =>
  !isCompleted && plannedDate !== null && getPlainDate(plannedDate) <= today
