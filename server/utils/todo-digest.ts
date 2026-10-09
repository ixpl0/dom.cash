import { formatCountedPushText, getPushText } from '~~/server/utils/push-texts'
import { TODO_DIGEST_TAG } from '~~/shared/schemas/push'
import type { PushMessage, TodoDigestOverdueMode } from '~~/shared/types/push'
import { getDaysBetweenPlainDates } from '~~/shared/utils/shared/dates'
import type { SupportedLocale } from '~~/shared/utils/shared/locale'
import type { ZonedTime } from '~~/shared/utils/shared/time-zones'

export interface DigestTodo {
  id: string
  content: string
  plannedDate: string
}

export interface TodoDigestSchedule {
  digestTime: number
  weekdays: readonly number[]
  lastSentDate: string | null
}

interface OverdueTodo extends DigestTodo {
  daysOverdue: number
}

export const TODO_DIGEST_URL = '/todo'

const PUSH_TEST_TAG = 'push-test'
const CATCH_UP_MINUTES = 120
const FADING_REMINDER_DAYS: readonly number[] = [1, 3, 7]
const DAYS_PER_WEEK = 7
const MAX_LISTED_TODOS = 4
const MAX_CONTENT_LENGTH = 60
const ELLIPSIS = '…'

export const isTodoDigestDue = ({ digestTime, weekdays, lastSentDate }: TodoDigestSchedule, { date, minutes, weekday }: ZonedTime): boolean =>
  weekdays.includes(weekday)
  && minutes >= digestTime
  && minutes < digestTime + CATCH_UP_MINUTES
  && lastSentDate !== date

export const shouldRemindOverdue = (daysOverdue: number, mode: TodoDigestOverdueMode): boolean => {
  switch (mode) {
    case 'daily': {
      return true
    }
    case 'off': {
      return false
    }
    case 'fading': {
      return FADING_REMINDER_DAYS.includes(daysOverdue) || (daysOverdue > DAYS_PER_WEEK && daysOverdue % DAYS_PER_WEEK === 0)
    }
  }
}

export const shortenTodoContent = (content: string): string => {
  const characters = Array.from(content.trim().split('\n')[0]?.trim() ?? '')

  if (characters.length <= MAX_CONTENT_LENGTH) {
    return characters.join('')
  }

  return `${characters.slice(0, MAX_CONTENT_LENGTH - ELLIPSIS.length).join('').trimEnd()}${ELLIPSIS}`
}

const toOverdueTodo = (todo: DigestTodo, today: string): OverdueTodo => ({
  ...todo,
  daysOverdue: getDaysBetweenPlainDates(todo.plannedDate, today),
})

export const buildTodoDigestMessage = (
  todos: readonly DigestTodo[],
  today: string,
  overdueMode: TodoDigestOverdueMode,
  locale: SupportedLocale,
): PushMessage | null => {
  const dueToday = todos.filter(todo => todo.plannedDate === today)
  const overdue = todos
    .filter(todo => todo.plannedDate < today)
    .map(todo => toOverdueTodo(todo, today))
    .sort((first, second) => first.daysOverdue - second.daysOverdue)
  const remindedOverdue = overdue.filter(todo => shouldRemindOverdue(todo.daysOverdue, overdueMode))

  if (dueToday.length === 0 && remindedOverdue.length === 0) {
    return null
  }

  const listedToday = dueToday.slice(0, MAX_LISTED_TODOS)
  const listedOverdue = remindedOverdue.slice(0, MAX_LISTED_TODOS - listedToday.length)
  const hiddenTodayCount = dueToday.length - listedToday.length
  const hiddenOverdueCount = overdueMode === 'off' ? 0 : overdue.length - listedOverdue.length
  const lines = [
    ...listedToday.map(todo => shortenTodoContent(todo.content)),
    ...listedOverdue.map(todo => `${shortenTodoContent(todo.content)} · ${formatCountedPushText(locale, 'daysAgo', todo.daysOverdue)}`),
    ...(hiddenTodayCount > 0 ? [formatCountedPushText(locale, 'moreToday', hiddenTodayCount)] : []),
    ...(hiddenOverdueCount > 0 ? [formatCountedPushText(locale, 'moreOverdue', hiddenOverdueCount)] : []),
  ]
  const listedTodos = [...listedToday, ...listedOverdue]
  const [singleTodo] = listedTodos.length === 1 && hiddenTodayCount === 0 && hiddenOverdueCount === 0 ? listedTodos : []

  return {
    title: dueToday.length > 0
      ? formatCountedPushText(locale, 'todayTitle', dueToday.length)
      : formatCountedPushText(locale, 'overdueTitle', overdue.length),
    body: lines.join('\n'),
    tag: TODO_DIGEST_TAG,
    url: TODO_DIGEST_URL,
    isSilent: true,
    todo: singleTodo ? { id: singleTodo.id, plannedDate: singleTodo.plannedDate } : null,
    actions: singleTodo
      ? [
          { action: 'complete', title: getPushText(locale, 'complete') },
          { action: 'postpone', title: getPushText(locale, 'postpone') },
        ]
      : [],
  }
}

export const buildTestPushMessage = (locale: SupportedLocale): PushMessage => ({
  title: getPushText(locale, 'testTitle'),
  body: getPushText(locale, 'testBody'),
  tag: PUSH_TEST_TAG,
  url: TODO_DIGEST_URL,
  isSilent: true,
  todo: null,
  actions: [],
})
