export interface MonthData {
  userMonthId: string
  year: number
  month: number
  balanceChange: number
  income: number
  pocketExpenses: number
  balanceSources: BalanceSourceData[]
  incomeEntries: IncomeEntryData[]
  expenseEntries: ExpenseEntryData[]
}

export interface BalanceSourceData {
  id: string
  name: string
  currency: string
  amount: number
}

export interface IncomeEntryData {
  id: string
  description: string
  currency: string
  amount: number
  date: string
}

export interface ExpenseEntryData {
  id: string
  description: string
  currency: string
  amount: number
  date: string
}

export interface UserSettings {
  baseCurrency: string
}
