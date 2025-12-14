export type IntervalUnit = 'day' | 'week' | 'month' | 'year'

export interface IntervalRecurrence {
  type: 'interval'
  unit: IntervalUnit
  value: number
}

export interface WeekdaysRecurrence {
  type: 'weekdays'
  days: number[]
}

export interface DayOfMonthRecurrence {
  type: 'dayOfMonth'
  day: number
}

export type RecurrencePattern
  = IntervalRecurrence
    | WeekdaysRecurrence
    | DayOfMonthRecurrence

export type RecurrenceType = RecurrencePattern['type']

export type DateReference = 'planned' | 'now'
