import { z } from 'zod'

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
}

export interface BudgetExportEntry {
  kind: 'balance' | 'income' | 'expense'
  description: string
  amount: number
  currency: string
  date?: string
}

export interface BudgetImportOptions {
  overwriteExisting: boolean
  skipExisting: boolean
}

export interface BudgetImportResult {
  success: boolean
  importedMonths: number
  importedEntries: number
  skippedMonths: number
  errors: string[]
}

export const budgetExportEntrySchema = z.object({
  kind: z.enum(['balance', 'income', 'expense']),
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  date: z.string().optional(),
})

export const budgetExportMonthSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(0).max(11),
  entries: z.array(budgetExportEntrySchema),
})

export const budgetExportSchema = z.object({
  version: z.literal('1.0'),
  exportDate: z.string(),
  user: z.object({
    username: z.string().min(1),
    mainCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
  }),
  months: z.array(budgetExportMonthSchema),
})

export const budgetImportOptionsSchema = z.object({
  overwriteExisting: z.boolean().default(false),
  skipExisting: z.boolean().default(true),
})

export type BudgetExportSchema = z.infer<typeof budgetExportSchema>
export type BudgetImportOptionsSchema = z.infer<typeof budgetImportOptionsSchema>
