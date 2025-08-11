export interface MonthData {
  id: string
  year: number
  month: number
  userMonthId: string
  balanceSources: BalanceSourceData[]
  incomeEntries: IncomeEntryData[]
  expenseEntries: ExpenseEntryData[]
  balanceChange: number
  pocketExpenses: number
  income: number
  exchangeRates?: Record<string, number>
  exchangeRatesSource?: string
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
}

export type BudgetEntry = BalanceSourceData | IncomeEntryData | ExpenseEntryData

export interface UserSettings {
  baseCurrency: string
}
