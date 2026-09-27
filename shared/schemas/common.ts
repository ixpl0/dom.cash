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

export const entryKindSchema = z.enum(['balance', 'income', 'expense'])

export const accessSchema = z.enum(['read', 'write'])
