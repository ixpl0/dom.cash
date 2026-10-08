import { z } from 'zod'
import { defineMcpTool, toolResult } from '~~/server/services/mcp/tool-definition'
import { matchesAllWords, toSearchWords } from '~~/server/services/mcp/text-search'
import { listTodos } from '~~/server/services/todo'
import type { RecurrencePattern } from '~~/shared/types/recurrence'
import type { TodoListItem } from '~~/shared/types/todo'

const MAX_TASKS = 200

const TASK_STATUSES = ['open', 'completed', 'all'] as const

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

type TaskStatus = typeof TASK_STATUSES[number]

const toMondayFirstIndex = (day: number): number => (day + 6) % 7

export const describeRecurrence = (pattern: RecurrencePattern): string => {
  switch (pattern.type) {
    case 'interval': {
      return pattern.value === 1 ? `every ${pattern.unit}` : `every ${pattern.value} ${pattern.unit}s`
    }
    case 'weekdays': {
      const days = [...pattern.days]
        .sort((first, second) => toMondayFirstIndex(first) - toMondayFirstIndex(second))
        .map(day => WEEKDAY_NAMES[day] ?? String(day))
      return `every week on ${days.join(', ')}`
    }
    case 'dayOfMonth': {
      return `every month on day ${pattern.day}`
    }
  }
}

const matchesStatus = ({ isCompleted }: TodoListItem, status: TaskStatus): boolean =>
  status === 'all' || (status === 'completed') === isCompleted

const compareOpenTasks = (first: TodoListItem, second: TodoListItem): number => {
  if (first.plannedDate === second.plannedDate) {
    return 0
  }
  if (first.plannedDate === null) {
    return 1
  }
  if (second.plannedDate === null) {
    return -1
  }
  return first.plannedDate < second.plannedDate ? -1 : 1
}

const compareCompletedTasks = (first: TodoListItem, second: TodoListItem): number =>
  second.updatedAt.localeCompare(first.updatedAt)

const sortTasks = (tasks: readonly TodoListItem[]): TodoListItem[] => [
  ...tasks.filter(task => !task.isCompleted).sort(compareOpenTasks),
  ...tasks.filter(task => task.isCompleted).sort(compareCompletedTasks),
]

const toTaskLine = ({ content, plannedDate, recurrence, isCompleted, isOwner, ownerUsername, sharedWith }: TodoListItem) => ({
  text: content,
  ...(plannedDate ? { plannedDate } : {}),
  ...(recurrence ? { repeats: describeRecurrence(recurrence) } : {}),
  ...(isCompleted ? { completed: true } : {}),
  ...(isOwner ? {} : { owner: ownerUsername }),
  ...(sharedWith.length > 0 ? { sharedWith: sharedWith.map(({ username }) => username) } : {}),
})

export const listTasksTool = defineMcpTool({
  name: 'list_tasks',
  title: 'Tasks',
  description: 'Tasks of the dom.cash user, including the tasks shared with them. Open tasks come first, ordered by plannedDate '
    + '(YYYY-MM-DD, sometimes with a time); a recurring task moves to its next date when it is completed.',
  scope: 'todo',
  input: z.object({
    status: z.enum(TASK_STATUSES).default('open'),
    query: z.string().trim().min(1).max(200).optional().describe('Words that must all occur in the task text'),
  }),
  run: async ({ status, query }, { event, user }) => {
    const words = query ? toSearchWords(query) : []
    const tasks = sortTasks((await listTodos(user.id, event))
      .filter(task => matchesStatus(task, status))
      .filter(task => matchesAllWords([task.content], words)))

    return toolResult({
      count: tasks.length,
      tasks: tasks.slice(0, MAX_TASKS).map(toTaskLine),
      ...(tasks.length > MAX_TASKS ? { truncated: true } : {}),
    })
  },
})
