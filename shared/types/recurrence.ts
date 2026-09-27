import type { z } from 'zod'
import type {
  dateReferenceSchema,
  dayOfMonthRecurrenceSchema,
  intervalRecurrenceSchema,
  recurrencePatternSchema,
  weekdaysRecurrenceSchema,
} from '~~/shared/schemas/recurrence'

export type IntervalRecurrence = z.infer<typeof intervalRecurrenceSchema>

export type IntervalUnit = IntervalRecurrence['unit']

export type WeekdaysRecurrence = z.infer<typeof weekdaysRecurrenceSchema>

export type DayOfMonthRecurrence = z.infer<typeof dayOfMonthRecurrenceSchema>

export type RecurrencePattern = z.infer<typeof recurrencePatternSchema>

export type RecurrenceType = RecurrencePattern['type']

export type DateReference = z.infer<typeof dateReferenceSchema>
