import { formatCountedPushText, getPushText } from '~~/server/utils/push-texts'
import { TODO_DIGEST_TAG } from '~~/shared/schemas/push'
import type { PushMessage, TodoDigestOverdueMode, TodoDigestUndatedMode } from '~~/shared/types/push'
import { getDaysBetweenPlainDates, getWeekStartPlainDate, PLAIN_MONTH_LENGTH } from '~~/shared/utils/shared/dates'
import type { SupportedLocale } from '~~/shared/utils/shared/locale'
import type { ZonedTime } from '~~/shared/utils/shared/time-zones'

export interface DigestTodo {
  id: string
  content: string
  plannedDate: string | null
}

export interface TodoDigestSchedule {
  digestTime: number
  weekdays: readonly number[]
  lastSentDate: string | null
}

export interface TodoDigestOptions {
  today: string
  overdueMode: TodoDigestOverdueMode
  includeUndated: boolean
  locale: SupportedLocale
}

interface DatedTodo extends DigestTodo {
  plannedDate: string
}

interface OverdueTodo extends DatedTodo {
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

export const isUndatedReminderDue = (mode: TodoDigestUndatedMode, lastUndatedDate: string | null, today: string): boolean => {
  switch (mode) {
    case 'off': {
      return false
    }
    case 'weekly': {
      return lastUndatedDate === null || getWeekStartPlainDate(lastUndatedDate) < getWeekStartPlainDate(today)
    }
    case 'monthly': {
      return lastUndatedDate === null || lastUndatedDate.slice(0, PLAIN_MONTH_LENGTH) < today.slice(0, PLAIN_MONTH_LENGTH)
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

const isDatedTodo = (todo: DigestTodo): todo is DatedTodo => todo.plannedDate !== null

const toOverdueTodo = (todo: DatedTodo, today: string): OverdueTodo => ({
  ...todo,
  daysOverdue: getDaysBetweenPlainDates(todo.plannedDate, today),
})

const getDigestTitle = (dueTodayCount: number, remindedOverdueCount: number, overdueCount: number, undatedCount: number, locale: SupportedLocale): string => {
  if (dueTodayCount > 0) {
    return formatCountedPushText(locale, 'todayTitle', dueTodayCount)
  }
  if (remindedOverdueCount > 0) {
    return formatCountedPushText(locale, 'overdueTitle', overdueCount)
  }
  return formatCountedPushText(locale, 'undatedTitle', undatedCount)
}

export const buildTodoDigestMessage = (
  todos: readonly DigestTodo[],
  { today, overdueMode, includeUndated, locale }: TodoDigestOptions,
): PushMessage | null => {
  const datedTodos = todos.filter(isDatedTodo)
  const dueToday = datedTodos.filter(todo => todo.plannedDate === today)
  const overdue = datedTodos
    .filter(todo => todo.plannedDate < today)
    .map(todo => toOverdueTodo(todo, today))
    .sort((first, second) => first.daysOverdue - second.daysOverdue)
  const remindedOverdue = overdue.filter(todo => shouldRemindOverdue(todo.daysOverdue, overdueMode))
  const undated = includeUndated ? todos.filter(todo => !isDatedTodo(todo)) : []

  if (dueToday.length === 0 && remindedOverdue.length === 0 && undated.length === 0) {
    return null
  }

  const listedToday = dueToday.slice(0, MAX_LISTED_TODOS)
  const listedOverdue = remindedOverdue.slice(0, MAX_LISTED_TODOS - listedToday.length)
  const listedUndated = undated.slice(0, MAX_LISTED_TODOS - listedToday.length - listedOverdue.length)
  const hiddenTodayCount = dueToday.length - listedToday.length
  const hiddenOverdueCount = overdueMode === 'off' ? 0 : overdue.length - listedOverdue.length
  const hiddenUndatedCount = undated.length - listedUndated.length
  const lines = [
    ...listedToday.map(todo => shortenTodoContent(todo.content)),
    ...listedOverdue.map(todo => `${shortenTodoContent(todo.content)} · ${formatCountedPushText(locale, 'daysAgo', todo.daysOverdue)}`),
    ...listedUndated.map(todo => `${shortenTodoContent(todo.content)} · ${getPushText(locale, 'noDate')}`),
    ...(hiddenTodayCount > 0 ? [formatCountedPushText(locale, 'moreToday', hiddenTodayCount)] : []),
    ...(hiddenOverdueCount > 0 ? [formatCountedPushText(locale, 'moreOverdue', hiddenOverdueCount)] : []),
    ...(hiddenUndatedCount > 0 ? [formatCountedPushText(locale, 'moreUndated', hiddenUndatedCount)] : []),
  ]
  const listedTodos: DigestTodo[] = [...listedToday, ...listedOverdue, ...listedUndated]
  const hasHiddenTodos = hiddenTodayCount + hiddenOverdueCount + hiddenUndatedCount > 0
  const [singleTodo] = listedTodos.length === 1 && !hasHiddenTodos ? listedTodos : []

  return {
    title: getDigestTitle(dueToday.length, remindedOverdue.length, overdue.length, undated.length, locale),
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
