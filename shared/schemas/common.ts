import { z } from 'zod'

export const MAX_AMOUNT = 10_000_000_000_000

export const currencySchema = z.string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Currency must be 3 uppercase letters')

export const usernameSchema = z.string()
  .trim()
  .min(1)
  .max(64)

export const descriptionSchema = z.string()
  .trim()
  .min(1)
  .max(255)

export const amountSchema = z.number()
  .nonnegative()
  .max(MAX_AMOUNT)

export const ENTRY_KINDS = ['balance', 'income', 'expense'] as const

export const ACCESS_LEVELS = ['read', 'write'] as const

export const entryKindSchema = z.enum(ENTRY_KINDS)

export const accessSchema = z.enum(ACCESS_LEVELS)

export type EntryKind = z.infer<typeof entryKindSchema>

export type AccessLevel = z.infer<typeof accessSchema>
