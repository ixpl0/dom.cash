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
  .nonnegative()

export const entryKindSchema = z.enum(['balance', 'income', 'expense'])

export const accessSchema = z.enum(['read', 'write'])
