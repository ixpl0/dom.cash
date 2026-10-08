export interface ZonedTime {
  date: string
  minutes: number
  weekday: number
}

const MINUTES_PER_HOUR = 60

const WEEKDAY_INDEXES: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    return Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone.length > 0
  }
  catch {
    return false
  }
}

export const getZonedTime = (now: Date, timeZone: string): ZonedTime => {
  const parts = Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(now)
  const readPart = (type: Intl.DateTimeFormatPartTypes): string => parts.find(part => part.type === type)?.value ?? ''

  return {
    date: `${readPart('year')}-${readPart('month')}-${readPart('day')}`,
    minutes: Number(readPart('hour')) * MINUTES_PER_HOUR + Number(readPart('minute')),
    weekday: WEEKDAY_INDEXES[readPart('weekday')] ?? 0,
  }
}
