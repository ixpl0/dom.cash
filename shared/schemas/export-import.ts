import { z } from 'zod'
import { amountSchema, currencySchema, descriptionSchema, entryKindSchema, usernameSchema } from '~~/shared/schemas/common'
import { amountForKindRule, hasAmountAllowedForKind, monthIndexSchema, planCommentSchema, plannedBalanceChangeSchema, yearSchema } from '~~/shared/schemas/budget'

export const budgetExportEntrySchema = z.object({
  kind: entryKindSchema,
  description: descriptionSchema,
  amount: amountSchema,
  currency: currencySchema,
  date: z.iso.date().optional(),
  isOptional: z.boolean().optional(),
}).refine(hasAmountAllowedForKind, amountForKindRule)

export const budgetExportMonthSchema = z.object({
  year: yearSchema,
  month: monthIndexSchema,
  entries: z.array(budgetExportEntrySchema),
  exchangeRates: z.record(z.string(), z.number()).optional(),
})

export const budgetExportPlanSchema = z.object({
  year: yearSchema,
  month: monthIndexSchema,
  plannedBalanceChange: plannedBalanceChangeSchema.nullable(),
  comment: planCommentSchema.nullable().optional(),
})

export const budgetExportSchema = z.object({
  version: z.literal('1.0'),
  exportDate: z.string(),
  user: z.object({
    username: usernameSchema,
    mainCurrency: currencySchema,
  }),
  months: z.array(budgetExportMonthSchema),
  plans: z.array(budgetExportPlanSchema).optional(),
})

export const budgetImportOptionsSchema = z.object({
  strategy: z.enum(['skip', 'overwrite']).default('skip'),
})
