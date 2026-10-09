import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildTestPushMessage, buildTodoDigestMessage, isTodoDigestDue, isUndatedReminderDue, shortenTodoContent, shouldRemindOverdue, type DigestTodo } from '../../server/utils/todo-digest'
import { pushDeviceSchema, todoDigestSettingsSchema } from '../../shared/schemas/push'
import type { TodoDigestOverdueMode } from '../../shared/types/push'
import { getDaysBetweenPlainDates, getWeekStartPlainDate } from '../../shared/utils/shared/dates'
import type { SupportedLocale } from '../../shared/utils/shared/locale'
import { getZonedTime, isValidTimeZone } from '../../shared/utils/shared/time-zones'

const TODAY = '2026-10-09'

const todoOn = (id: string, plannedDate: string | null, content = `Task ${id}`): DigestTodo => ({ id, content, plannedDate })

const digest = (todos: readonly DigestTodo[], overdueMode: TodoDigestOverdueMode, locale: SupportedLocale, includeUndated = false) =>
  buildTodoDigestMessage(todos, { today: TODAY, overdueMode, includeUndated, locale })

const CHROME_SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/dmSx3Wq9F1k:APA91bGx',
  keys: {
    p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
    auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  },
  timeZone: 'Europe/Moscow',
}

test('getZonedTime reads the local date, minutes and weekday of a time zone', () => {
  const now = new Date('2026-10-09T05:30:00Z')

  assert.deepEqual(getZonedTime(now, 'Europe/Moscow'), { date: '2026-10-09', minutes: 8 * 60 + 30, weekday: 5 })
  assert.deepEqual(getZonedTime(now, 'America/Los_Angeles'), { date: '2026-10-08', minutes: 22 * 60 + 30, weekday: 4 })
  assert.deepEqual(getZonedTime(now, 'Asia/Kolkata'), { date: '2026-10-09', minutes: 11 * 60, weekday: 5 })
  assert.deepEqual(getZonedTime(new Date('2026-10-09T21:00:00Z'), 'Europe/Moscow'), { date: '2026-10-10', minutes: 0, weekday: 6 })
})

test('isValidTimeZone accepts IANA names only', () => {
  assert.equal(isValidTimeZone('Europe/Moscow'), true)
  assert.equal(isValidTimeZone('UTC'), true)
  assert.equal(isValidTimeZone('Mars/Olympus_Mons'), false)
  assert.equal(isValidTimeZone(''), false)
})

test('getDaysBetweenPlainDates counts calendar days across months', () => {
  assert.equal(getDaysBetweenPlainDates('2026-10-08', TODAY), 1)
  assert.equal(getDaysBetweenPlainDates('2026-09-30T00:00', TODAY), 9)
  assert.equal(getDaysBetweenPlainDates(TODAY, TODAY), 0)
})

test('isTodoDigestDue waits for the digest time and catches up for two hours once a day', () => {
  const schedule = { digestTime: 9 * 60, weekdays: [1, 2, 3, 4, 5], lastSentDate: '2026-10-08' }
  const friday = (minutes: number) => ({ date: TODAY, minutes, weekday: 5 })

  assert.equal(isTodoDigestDue(schedule, friday(8 * 60 + 45)), false)
  assert.equal(isTodoDigestDue(schedule, friday(9 * 60)), true)
  assert.equal(isTodoDigestDue(schedule, friday(10 * 60 + 45)), true)
  assert.equal(isTodoDigestDue(schedule, friday(11 * 60)), false)
  assert.equal(isTodoDigestDue({ ...schedule, lastSentDate: TODAY }, friday(9 * 60 + 15)), false)
  assert.equal(isTodoDigestDue(schedule, { date: '2026-10-10', minutes: 9 * 60, weekday: 6 }), false)
  assert.equal(isTodoDigestDue({ ...schedule, weekdays: [] }, friday(9 * 60)), false)
})

test('shouldRemindOverdue fades to weekly reminders', () => {
  const remindedDays = Array.from({ length: 30 }, (_, index) => index + 1).filter(days => shouldRemindOverdue(days, 'fading'))

  assert.deepEqual(remindedDays, [1, 3, 7, 14, 21, 28])
  assert.equal(shouldRemindOverdue(2, 'daily'), true)
  assert.equal(shouldRemindOverdue(1, 'off'), false)
})

test('buildTodoDigestMessage lists the tasks for today in a silent notification', () => {
  const message = digest([todoOn('a', TODAY, 'Pay for the internet'), todoOn('b', TODAY, 'Pick up the parcel')], 'fading', 'en')

  assert.deepEqual(message, {
    title: '2 tasks for today',
    body: 'Pay for the internet\nPick up the parcel',
    tag: 'todo-digest',
    url: '/todo',
    isSilent: true,
    todo: null,
    actions: [],
  })
})

test('buildTodoDigestMessage offers actions when the digest names a single task', () => {
  const message = digest([todoOn('a', TODAY, 'Оплатить интернет')], 'fading', 'ru')

  assert.equal(message?.title, '1 задача на сегодня')
  assert.equal(message?.body, 'Оплатить интернет')
  assert.deepEqual(message?.todo, { id: 'a', plannedDate: TODAY })
  assert.deepEqual(message?.actions, [{ action: 'complete', title: 'Готово' }, { action: 'postpone', title: 'Завтра' }])
})

test('buildTodoDigestMessage reminds of an overdue task quietly on fading days only', () => {
  const dentist = todoOn('dentist', '2026-10-06', 'Book the dentist')

  const thirdDay = digest([dentist], 'fading', 'en')

  assert.equal(thirdDay?.title, '1 overdue task')
  assert.equal(thirdDay?.body, 'Book the dentist · 3 days ago')
  assert.equal(thirdDay?.isSilent, true)
  assert.deepEqual(thirdDay?.todo, { id: 'dentist', plannedDate: '2026-10-06' })
  assert.equal(digest([todoOn('dentist', '2026-10-07')], 'fading', 'en'), null)
  assert.equal(digest([todoOn('dentist', '2026-10-07')], 'daily', 'en')?.body, 'Task dentist · 2 days ago')
  assert.equal(digest([dentist], 'off', 'en'), null)
})

test('buildTodoDigestMessage counts overdue tasks it does not name', () => {
  const todos = [
    todoOn('today', TODAY, 'Water the plants'),
    todoOn('yesterday', '2026-10-08', 'Call grandma'),
    todoOn('two-days', '2026-10-07', 'Fix the tap'),
    todoOn('five-days', '2026-10-04', 'Renew the passport'),
  ]

  const message = digest(todos, 'fading', 'ru')

  assert.equal(message?.title, '1 задача на сегодня')
  assert.equal(message?.body, 'Water the plants\nCall grandma · 1 день назад\nи ещё 2 просроченные')
  assert.equal(message?.todo, null)
  assert.deepEqual(message?.actions, [])
  assert.equal(digest(todos, 'off', 'ru')?.body, 'Water the plants')
})

test('buildTodoDigestMessage names at most four tasks', () => {
  const todos = [
    ...Array.from({ length: 5 }, (_, index) => todoOn(`today-${index}`, TODAY)),
    todoOn('week', '2026-10-02'),
  ]

  const message = digest(todos, 'daily', 'en')

  assert.equal(message?.title, '5 tasks for today')
  assert.equal(message?.body, 'Task today-0\nTask today-1\nTask today-2\nTask today-3\nand 1 more for today\nand 1 more overdue')
})

test('buildTodoDigestMessage picks Russian plural forms', () => {
  const todayTasks = (count: number) => Array.from({ length: count }, (_, index) => todoOn(`t${index}`, TODAY))

  assert.equal(digest(todayTasks(2), 'off', 'ru')?.title, '2 задачи на сегодня')
  assert.equal(digest(todayTasks(5), 'off', 'ru')?.title, '5 задач на сегодня')
  assert.equal(digest(todayTasks(21), 'off', 'ru')?.title, '21 задача на сегодня')
  assert.equal(digest([todoOn('old', '2026-09-18', 'Отправить документы')], 'fading', 'ru')?.body, 'Отправить документы · 21 день назад')
  assert.equal(digest([todoOn('a', '2026-10-08'), todoOn('b', '2026-10-01')], 'daily', 'ru')?.title, '2 просроченные задачи')
})

test('getWeekStartPlainDate finds the Monday of the week', () => {
  assert.equal(getWeekStartPlainDate('2026-10-10'), '2026-10-05')
  assert.equal(getWeekStartPlainDate('2026-10-11'), '2026-10-05')
  assert.equal(getWeekStartPlainDate('2026-10-05'), '2026-10-05')
  assert.equal(getWeekStartPlainDate('2026-11-01T00:00'), '2026-10-26')
})

test('isUndatedReminderDue reminds in the first digest of a week or a month', () => {
  assert.equal(isUndatedReminderDue('off', null, TODAY), false)
  assert.equal(isUndatedReminderDue('weekly', null, TODAY), true)
  assert.equal(isUndatedReminderDue('weekly', '2026-10-05', '2026-10-11'), false)
  assert.equal(isUndatedReminderDue('weekly', '2026-10-05', '2026-10-12'), true)
  assert.equal(isUndatedReminderDue('weekly', '2026-10-09', '2026-10-12'), true)
  assert.equal(isUndatedReminderDue('monthly', null, TODAY), true)
  assert.equal(isUndatedReminderDue('monthly', '2026-10-01', '2026-10-31'), false)
  assert.equal(isUndatedReminderDue('monthly', '2026-10-01', '2026-11-01'), true)
  assert.equal(isUndatedReminderDue('monthly', '2026-12-31', '2027-01-01'), true)
})

test('buildTodoDigestMessage lists tasks without a date only when they are due', () => {
  const undated = [todoOn('tbc', null, 'Close the TBC card'), todoOn('credo', null, 'Close the CREDO card'), todoOn('cv', null, 'Sync the CV')]

  assert.equal(digest(undated, 'daily', 'en'), null)
  assert.deepEqual(digest(undated, 'daily', 'en', true), {
    title: '3 tasks without a date',
    body: 'Close the TBC card · no date\nClose the CREDO card · no date\nSync the CV · no date',
    tag: 'todo-digest',
    url: '/todo',
    isSilent: true,
    todo: null,
    actions: [],
  })
})

test('buildTodoDigestMessage puts tasks without a date after the dated ones', () => {
  const undated = (count: number) => Array.from({ length: count }, (_, index) => todoOn(`undated-${index}`, null))

  assert.equal(
    digest([todoOn('today', TODAY, 'Water the plants'), ...undated(5)], 'daily', 'ru', true)?.body,
    'Water the plants\nTask undated-0 · без даты\nTask undated-1 · без даты\nTask undated-2 · без даты\nи ещё 2 без даты',
  )
  assert.equal(digest([todoOn('today', TODAY), ...undated(2)], 'daily', 'ru', true)?.title, '1 задача на сегодня')
  assert.equal(digest(undated(2), 'daily', 'ru', true)?.title, '2 задачи без даты')
  assert.equal(digest(undated(5), 'daily', 'ru', true)?.title, '5 задач без даты')

  const withQuietOverdue = digest([todoOn('two-days', '2026-10-07'), ...undated(1)], 'fading', 'en', true)

  assert.equal(withQuietOverdue?.title, '1 task without a date')
  assert.equal(withQuietOverdue?.body, 'Task undated-0 · no date\nand 1 more overdue')
  assert.equal(withQuietOverdue?.todo, null)
})

test('buildTodoDigestMessage offers actions for a single task without a date', () => {
  const message = digest([todoOn('cv', null, 'Sync the CV')], 'fading', 'en', true)

  assert.deepEqual(message?.todo, { id: 'cv', plannedDate: null })
  assert.deepEqual(message?.actions.map(({ action }) => action), ['complete', 'postpone'])
})

test('shortenTodoContent keeps the first line and cuts long text without breaking characters', () => {
  assert.equal(shortenTodoContent('  Buy milk\nand bread  '), 'Buy milk')
  assert.equal(shortenTodoContent('a'.repeat(60)), 'a'.repeat(60))
  assert.equal(shortenTodoContent(`${'a'.repeat(58)} b long tail`), `${'a'.repeat(58)}…`)
  assert.equal(shortenTodoContent('🙂'.repeat(61)), `${'🙂'.repeat(59)}…`)
})

test('buildTestPushMessage speaks the user language', () => {
  assert.equal(buildTestPushMessage('ru').title, 'Уведомления работают')
  assert.equal(buildTestPushMessage('en').title, 'Notifications work')
  assert.equal(buildTestPushMessage('en').tag, 'push-test')
  assert.equal(buildTestPushMessage('en').isSilent, true)
})

test('pushDeviceSchema accepts a browser subscription from a known push service', () => {
  const padded = { ...CHROME_SUBSCRIPTION, keys: { p256dh: `${CHROME_SUBSCRIPTION.keys.p256dh}=`, auth: `${CHROME_SUBSCRIPTION.keys.auth}==` } }

  assert.deepEqual(pushDeviceSchema.parse({ ...CHROME_SUBSCRIPTION, expirationTime: null, locale: 'ru' }), { ...CHROME_SUBSCRIPTION, locale: 'ru' })
  assert.deepEqual(pushDeviceSchema.parse(padded).keys, CHROME_SUBSCRIPTION.keys)
  assert.equal(pushDeviceSchema.safeParse({ ...CHROME_SUBSCRIPTION, endpoint: 'https://wns2-par02p.notify.windows.com/w/?token=abc' }).success, true)
  assert.equal(pushDeviceSchema.safeParse({ ...CHROME_SUBSCRIPTION, endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/abc' }).success, true)
})

test('pushDeviceSchema refuses other hosts, plain http, broken keys and unknown time zones', () => {
  const refuses = (overrides: Record<string, unknown>) =>
    assert.equal(pushDeviceSchema.safeParse({ ...CHROME_SUBSCRIPTION, ...overrides }).success, false)

  refuses({ endpoint: 'https://example.com/push' })
  refuses({ endpoint: 'https://fcm.googleapis.com.example.com/push' })
  refuses({ endpoint: 'http://fcm.googleapis.com/fcm/send/abc' })
  refuses({ keys: { ...CHROME_SUBSCRIPTION.keys, p256dh: 'short' } })
  refuses({ keys: { ...CHROME_SUBSCRIPTION.keys, auth: 'BTBZMqHH6r4Tts7J+aSIgg' } })
  refuses({ timeZone: 'Mars/Olympus_Mons' })
  refuses({ locale: 'de' })
})

test('todoDigestSettingsSchema takes quarter hours and distinct weekdays', () => {
  const settings = { digestTime: 8 * 60 + 15, weekdays: [1, 2, 3], overdueMode: 'fading', undatedMode: 'weekly' }

  assert.equal(todoDigestSettingsSchema.safeParse(settings).success, true)
  assert.equal(todoDigestSettingsSchema.safeParse({ ...settings, weekdays: [] }).success, true)
  assert.equal(todoDigestSettingsSchema.safeParse({ ...settings, digestTime: 8 * 60 + 7 }).success, false)
  assert.equal(todoDigestSettingsSchema.safeParse({ ...settings, digestTime: 24 * 60 }).success, false)
  assert.equal(todoDigestSettingsSchema.safeParse({ ...settings, weekdays: [1, 1] }).success, false)
  assert.equal(todoDigestSettingsSchema.safeParse({ ...settings, weekdays: [7] }).success, false)
  assert.equal(todoDigestSettingsSchema.safeParse({ ...settings, overdueMode: 'hourly' }).success, false)
  assert.equal(todoDigestSettingsSchema.safeParse({ ...settings, undatedMode: 'yearly' }).success, false)
  assert.equal(todoDigestSettingsSchema.safeParse({ digestTime: 480, weekdays: [1], overdueMode: 'fading' }).success, false)
})
