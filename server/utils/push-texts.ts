import { getRussianPluralForm } from '~~/i18n/plural-rules'
import type { SupportedLocale } from '~~/shared/utils/shared/locale'

type PluralForms = readonly [string, ...string[]]

type CountedTextKey = 'todayTitle' | 'overdueTitle' | 'daysAgo' | 'moreToday' | 'moreOverdue'

type PlainTextKey = 'complete' | 'postpone' | 'testTitle' | 'testBody'

interface PushTexts {
  counted: Record<CountedTextKey, PluralForms>
  plain: Record<PlainTextKey, string>
}

const PUSH_TEXTS: Record<SupportedLocale, PushTexts> = {
  en: {
    counted: {
      todayTitle: ['{count} task for today', '{count} tasks for today'],
      overdueTitle: ['{count} overdue task', '{count} overdue tasks'],
      daysAgo: ['{count} day ago', '{count} days ago'],
      moreToday: ['and {count} more for today'],
      moreOverdue: ['and {count} more overdue'],
    },
    plain: {
      complete: 'Done',
      postpone: 'Tomorrow',
      testTitle: 'Notifications work',
      testBody: 'This is how the daily task digest will arrive',
    },
  },
  ru: {
    counted: {
      todayTitle: ['{count} задача на сегодня', '{count} задачи на сегодня', '{count} задач на сегодня'],
      overdueTitle: ['{count} просроченная задача', '{count} просроченные задачи', '{count} просроченных задач'],
      daysAgo: ['{count} день назад', '{count} дня назад', '{count} дней назад'],
      moreToday: ['и ещё {count} на сегодня'],
      moreOverdue: ['и ещё {count} просроченная', 'и ещё {count} просроченные', 'и ещё {count} просроченных'],
    },
    plain: {
      complete: 'Готово',
      postpone: 'Завтра',
      testTitle: 'Уведомления работают',
      testBody: 'Так будет приходить сводка задач',
    },
  },
}

const ENGLISH_ONE = 1

const getPluralFormIndex = (locale: SupportedLocale, count: number, formCount: number): number => {
  if (locale === 'ru') {
    return getRussianPluralForm(count, formCount)
  }
  return Math.min(count === ENGLISH_ONE ? 0 : 1, formCount - 1)
}

export const formatCountedPushText = (locale: SupportedLocale, key: CountedTextKey, count: number): string => {
  const forms = PUSH_TEXTS[locale].counted[key]
  const form = forms[getPluralFormIndex(locale, count, forms.length)] ?? forms[0]
  return form.replace('{count}', String(count))
}

export const getPushText = (locale: SupportedLocale, key: PlainTextKey): string => PUSH_TEXTS[locale].plain[key]
