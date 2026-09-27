import type { z } from 'zod'
import type { AccessLevel } from '~~/shared/schemas/common'
import type { updateEntrySchema } from '~~/shared/schemas/budget'

export interface MonthData {
  id: string
  year: number
  month: number
  balanceSources: BalanceSourceData[]
  incomeEntries: IncomeEntryData[]
  expenseEntries: ExpenseEntryData[]
  exchangeRates: Record<string, number>
  exchangeRatesSource: string
  isPlanOnly?: boolean
}

export type BudgetAccess = 'owner' | AccessLevel

export interface BudgetData {
  user: {
    id: string
    username: string
    mainCurrency: string
  }
  access: BudgetAccess
  months: MonthData[]
}

export interface YearsData {
  availableYears: YearInfo[]
  initialYears: number[]
}

export interface PlanData {
  id: string
  year: number
  month: number
  plannedBalanceChange: number | null
  comment: string | null
}

export interface ComputedMonthData extends MonthData {
  monthId: string
  startBalance: number | null
  totalIncome: number
  totalExpenses: number
  totalOptionalExpenses: number
  calculatedBalanceChange: number | null
  calculatedPocketExpenses: number | null
  currencyProfitLoss: number | null
  totalAllExpenses: number | null
  nextMonthStartBalance: number | null
  isUsingOtherMonthRates: boolean
  sourceMonthTitle: string
  missingRateCurrencies: string[]
  plannedBalanceChange: number | null
  plannedVsActualDiff: number | null
  expectedBalance: number | null
  planComment: string | null
}

export interface YearSummary {
  year: number
  monthCount: number
  totalStartBalance: number
  totalIncome: number
  totalExpenses: number
  totalOptionalExpenses: number
  totalBalanceChange: number
  totalPocketExpenses: number
  totalCurrencyProfitLoss: number
  totalAllExpenses: number
  totalPlannedBalanceChange: number
  totalPlannedVsActualDiff: number
  avgStartBalance: number
  avgIncome: number
  avgExpenses: number
  avgOptionalExpenses: number
  avgBalanceChange: number
  avgPocketExpenses: number
  avgCurrencyProfitLoss: number
  avgAllExpenses: number
  avgPlannedBalanceChange: number
  avgPlannedVsActualDiff: number
  plannedMonthCount: number
  plannedDiffMonthCount: number
  endOfYearExpectedBalance: number | null
}

interface BaseBudgetEntry {
  id: string
  description: string
  amount: number
  currency: string
}

export type BalanceSourceData = BaseBudgetEntry

export interface IncomeEntryData extends BaseBudgetEntry {
  date: string | null
}

export interface ExpenseEntryData extends BaseBudgetEntry {
  date: string | null
  isOptional?: boolean
}

export type BudgetEntry = BalanceSourceData | IncomeEntryData | ExpenseEntryData

export interface SavedEntry extends BaseBudgetEntry {
  date?: string | null
  isOptional?: boolean
}

export type EntryPayload = z.infer<typeof updateEntrySchema>

export interface YearInfo {
  year: number
  monthCount: number
  months: number[]
}
