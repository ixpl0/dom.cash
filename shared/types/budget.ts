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
  exchangeRates: Record<string, number>
  exchangeRatesSource: string
}

export interface ComputedMonthData extends MonthData {
  monthId: string
  startBalance: number
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
  avgStartBalance: number
  avgIncome: number
  avgExpenses: number
  avgOptionalExpenses: number
  avgBalanceChange: number
  avgPocketExpenses: number
  avgCurrencyProfitLoss: number
  avgAllExpenses: number
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

export interface UserSettings {
  baseCurrency: string
}
