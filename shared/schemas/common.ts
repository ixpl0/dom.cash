import { z } from 'zod'

export const currencySchema = z.string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Currency must be 3 uppercase letters')

export const usernameSchema = z.string()
  .min(1)
  .max(64)
  .trim()

export const descriptionSchema = z.string()
  .min(1)
  .max(255)

export const amountSchema = z.number()
  .positive()

export const entryKindSchema = z.enum(['balance', 'income', 'expense'])

export const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .optional()
