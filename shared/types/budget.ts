export interface MonthData {
  year: number
  month: number
  userMonthId: string
  balanceSources: BalanceSourceData[]
  incomeEntries: IncomeEntryData[]
  expenseEntries: ExpenseEntryData[]
  balanceChange: number
  pocketExpenses: number
  income: number
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
  amount: number
  currency: string
  date: string
}

export interface ExpenseEntryData {
  id: string
  description: string
  amount: number
  currency: string
  date: string
}

export interface UserSettings {
  baseCurrency: string
}
