import { z } from 'zod'
import { currencySchema, usernameSchema, descriptionSchema, amountSchema, entryKindSchema } from '~~/shared/schemas/common'
import { amountForKindRule, hasAmountAllowedForKind, monthIndexSchema, planCommentSchema, plannedBalanceChangeSchema, yearSchema } from '~~/shared/schemas/budget'

export interface BudgetExportData {
  version: '1.0'
  exportDate: string
  user: {
    username: string
    mainCurrency: string
  }
  months: BudgetExportMonth[]
  plans?: BudgetExportPlan[]
}

export interface BudgetExportMonth {
  year: number
  month: number
  entries: BudgetExportEntry[]
  exchangeRates: Record<string, number>
}

export interface BudgetExportPlan {
  year: number
  month: number
  plannedBalanceChange: number | null
  comment?: string | null
}

export interface BudgetExportEntry {
  kind: 'balance' | 'income' | 'expense'
  description: string
  amount: number
  currency: string
  date?: string
  isOptional?: boolean
}

export type ImportStrategy = 'skip' | 'overwrite'

export interface BudgetImportOptions {
  strategy: ImportStrategy
}

export type BudgetImportErrorKind = 'tooLarge' | 'failed'

export interface BudgetImportError {
  year: number
  month: number
  kind: BudgetImportErrorKind
}

export interface BudgetImportResult {
  success: boolean
  importedMonths: number
  importedEntries: number
  skippedMonths: number
  errors: BudgetImportError[]
}

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

export type BudgetExportSchema = z.infer<typeof budgetExportSchema>
export type BudgetImportOptionsSchema = z.infer<typeof budgetImportOptionsSchema>
