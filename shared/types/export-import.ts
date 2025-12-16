import { z } from 'zod'
import { currencySchema, usernameSchema, descriptionSchema, amountSchema, entryKindSchema } from '~~/shared/schemas/common'

export interface BudgetExportData {
  version: '1.0'
  exportDate: string
  user: {
    username: string
    mainCurrency: string
  }
  months: BudgetExportMonth[]
}

export interface BudgetExportMonth {
  year: number
  month: number
  entries: BudgetExportEntry[]
  exchangeRates: Record<string, number>
}

export interface BudgetExportEntry {
  kind: 'balance' | 'income' | 'expense'
  description: string
  amount: number
  currency: string
  date?: string
}

export type ImportStrategy = 'skip' | 'overwrite'

export interface BudgetImportOptions {
  strategy: ImportStrategy
}

export interface BudgetImportResult {
  success: boolean
  importedMonths: number
  importedEntries: number
  skippedMonths: number
  errors: string[]
}

export const budgetExportEntrySchema = z.object({
  kind: entryKindSchema,
  description: descriptionSchema,
  amount: amountSchema,
  currency: currencySchema,
  date: z.string().optional(),
})

export const budgetExportMonthSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(0).max(11),
  entries: z.array(budgetExportEntrySchema),
  exchangeRates: z.record(z.string(), z.number()).optional(),
})

export const budgetExportSchema = z.object({
  version: z.literal('1.0'),
  exportDate: z.string(),
  user: z.object({
    username: usernameSchema,
    mainCurrency: currencySchema,
  }),
  months: z.array(budgetExportMonthSchema),
})

export const budgetImportOptionsSchema = z.object({
  strategy: z.enum(['skip', 'overwrite']).default('skip'),
})

export type BudgetExportSchema = z.infer<typeof budgetExportSchema>
export type BudgetImportOptionsSchema = z.infer<typeof budgetImportOptionsSchema>
