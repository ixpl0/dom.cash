import type { z } from 'zod'
import type {
  budgetExportEntrySchema,
  budgetExportMonthSchema,
  budgetExportPlanSchema,
  budgetExportSchema,
  budgetImportOptionsSchema,
} from '~~/shared/schemas/export-import'

export type BudgetExportData = z.infer<typeof budgetExportSchema>

export type BudgetExportMonth = z.infer<typeof budgetExportMonthSchema>

export type BudgetExportPlan = z.infer<typeof budgetExportPlanSchema>

export type BudgetExportEntry = z.infer<typeof budgetExportEntrySchema>

export type BudgetImportOptions = z.infer<typeof budgetImportOptionsSchema>

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
