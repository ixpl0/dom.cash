import type { MonthData } from '~~/shared/types/budget'
import type { BudgetShareAccess } from '~~/server/db/schema'
import { getNextMonth, getPreviousMonth, findClosestMonthForCopy } from '~~/shared/utils/month-helpers'
import { getEntryConfig, updateMonthWithNewEntry, updateMonthWithUpdatedEntry, updateMonthWithDeletedEntry, findEntryKindByEntryId } from '~~/shared/utils/entry-strategies'
import { toMutable } from '~~/shared/utils/immutable'

export interface BudgetData {
  user: {
    username: string
    mainCurrency: string
  }
  access: BudgetShareAccess | 'owner'
  months: MonthData[]
}

export interface BudgetState {
  data: BudgetData | null
  isLoading: boolean
  error: string | null
  canEdit: boolean
  canView: boolean
}

export const useBudgetStore = defineStore('budget', {
  state: (): BudgetState => ({
    data: null,
    isLoading: false,
    error: null,
    canEdit: false,
    canView: false,
  }),

  getters: {
    isOwnBudget(): boolean {
      return this.data?.access === 'owner'
    },

    months(): MonthData[] {
      return this.data?.months || []
    },

    getMonthById: state => (monthId: string): MonthData | undefined => {
      return state.data?.months.find(month => month.id === monthId)
    },

    getEntriesByMonthAndKind: state => (monthId: string, entryKind: 'balance' | 'income' | 'expense') => {
      const month = state.data?.months.find(m => m.id === monthId)
      if (!month) return []

      switch (entryKind) {
        case 'balance':
          return month.balanceSources || []
        case 'income':
          return month.incomeEntries || []
        case 'expense':
          return month.expenseEntries || []
        default:
          return []
      }
    },
  },

  actions: {
    async refresh(targetUsername?: string) {
      const shouldShowLoading = !this.data

      if (shouldShowLoading) {
        this.isLoading = true
      }
      this.error = null

      try {
        if (import.meta.server) {
          const { data, error } = await useFetch<BudgetData>(
            targetUsername ? `/api/budget/user/${targetUsername}` : '/api/budget',
            {
              key: targetUsername ? `budget-user-${targetUsername}` : 'budget-own',
              server: true,
            },
          )

          if (error.value) {
            this.error = error.value.data?.message || 'Failed to load budget'
            this.data = null
          }
          else {
            this.data = data.value || null
          }
        }
        else {
          if (!targetUsername) {
            const data = await $fetch<BudgetData>('/api/budget')
            this.data = data || null
          }
          else {
            const data = await $fetch<BudgetData>(`/api/budget/user/${targetUsername}`)
            this.data = data || null
          }
        }

        if (this.data) {
          this.canEdit = this.data.access === 'owner' || this.data.access === 'write'
          this.canView = true
        }
      }
      catch (error) {
        console.error('Error refreshing budget:', error)
        this.error = 'Failed to load budget'
      }
      finally {
        if (shouldShowLoading) {
          this.isLoading = false
        }
      }
    },

    async createMonth(year: number, month: number, copyFromMonthId?: string) {
      if (!this.data) return

      try {
        const requestBody: {
          year: number
          month: number
          copyFromMonthId?: string
          targetUsername?: string
        } = { year, month }

        if (copyFromMonthId) {
          requestBody.copyFromMonthId = copyFromMonthId
        }

        if (this.data.user.username) {
          requestBody.targetUsername = this.data.user.username
        }

        const response = await $fetch<MonthData>('/api/budget/months', {
          method: 'POST',
          body: requestBody,
        })

        const updatedMonths = [...this.data.months, response].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year
          return b.month - a.month
        })

        this.data = {
          ...this.data,
          months: toMutable(updatedMonths),
        }
      }
      catch (error) {
        console.error('Error creating month:', error)
        throw error
      }
    },

    async createNextMonth() {
      if (!this.data?.months.length) return

      const { year, month } = getNextMonth(this.data.months)
      const copyFromId = findClosestMonthForCopy(this.data.months, year, month, 'previous')

      await this.createMonth(year, month, copyFromId || undefined)
    },

    async createPreviousMonth() {
      if (!this.data?.months.length) return

      const { year, month } = getPreviousMonth(this.data.months)

      await this.createMonth(year, month)
    },

    async addEntry(
      monthId: string,
      entryKind: 'balance' | 'income' | 'expense',
      entryData: {
        description: string
        amount: number
        currency: string
        date?: string
      },
    ) {
      try {
        const response = await $fetch<{
          id: string
          description: string
          amount: number
          currency: string
          date?: string | null
        }>('/api/budget/entries', {
          method: 'POST',
          body: {
            monthId,
            kind: entryKind,
            ...entryData,
          },
        })

        if (!response || !this.data) return

        const months = this.data.months
        const monthIndex = months.findIndex(m => m.id === monthId)
        if (monthIndex === -1) return

        const config = getEntryConfig(entryKind)
        const newEntry = config.createEntry({
          id: response.id,
          description: response.description,
          amount: response.amount,
          currency: response.currency,
          date: response.date ?? undefined,
        })

        const month = months[monthIndex]
        if (!month) return

        const updatedMonth = updateMonthWithNewEntry(month, entryKind, newEntry) as MonthData
        const updatedMonths = [...months]
        updatedMonths[monthIndex] = updatedMonth

        this.data = {
          ...this.data,
          months: toMutable(updatedMonths),
        }
      }
      catch (error) {
        console.error('Error adding entry:', error)
        throw error
      }
    },

    async updateEntry(
      entryId: string,
      entryData: {
        description: string
        amount: number
        currency: string
        date?: string
      },
    ) {
      try {
        const response = await $fetch<{
          id: string
          description: string
          amount: number
          currency: string
          date?: string | null
        }>(`/api/budget/entries/${entryId}`, {
          method: 'PUT',
          body: entryData,
        })

        if (!response || !this.data) return

        const months = this.data.months
        let entryKindResult: { month: MonthData, kind: 'balance' | 'income' | 'expense' } | null = null

        for (const month of months) {
          const entryKind = findEntryKindByEntryId(month, entryId)
          if (entryKind) {
            entryKindResult = { month, kind: entryKind }
            break
          }
        }

        if (!entryKindResult) return

        const updatedMonth = updateMonthWithUpdatedEntry(
          entryKindResult.month,
          entryKindResult.kind,
          response.id,
          {
            description: response.description,
            amount: response.amount,
            currency: response.currency,
            date: response.date ?? undefined,
          },
        ) as MonthData

        const monthIndex = months.findIndex(m => m.id === entryKindResult.month.id)
        if (monthIndex === -1) return

        const updatedMonths = [...months]
        updatedMonths[monthIndex] = updatedMonth

        this.data = {
          ...this.data,
          months: toMutable(updatedMonths),
        }
      }
      catch (error) {
        console.error('Error updating entry:', error)
        throw error
      }
    },

    async deleteEntry(entryId: string) {
      try {
        await $fetch(`/api/budget/entries/${entryId}`, {
          method: 'DELETE',
        })

        if (!this.data) return

        const months = this.data.months
        let entryKindResult: { month: MonthData, kind: 'balance' | 'income' | 'expense' } | null = null

        for (const month of months) {
          const entryKind = findEntryKindByEntryId(month, entryId)
          if (entryKind) {
            entryKindResult = { month, kind: entryKind }
            break
          }
        }

        if (!entryKindResult) return

        const updatedMonth = updateMonthWithDeletedEntry(entryKindResult.month, entryKindResult.kind, entryId) as MonthData
        const monthIndex = months.findIndex(m => m.id === entryKindResult.month.id)
        if (monthIndex === -1) return

        const updatedMonths = [...months]
        updatedMonths[monthIndex] = updatedMonth

        this.data = {
          ...this.data,
          months: toMutable(updatedMonths),
        }
      }
      catch (error) {
        console.error('Error deleting entry:', error)
        throw error
      }
    },

    async deleteMonth(monthId: string) {
      try {
        await $fetch(`/api/budget/months/${monthId}`, {
          method: 'DELETE',
        })

        if (!this.data) return

        const updatedMonths = this.data.months.filter(month => month.id !== monthId)
        this.data = {
          ...this.data,
          months: toMutable(updatedMonths),
        }
      }
      catch (error) {
        console.error('Error deleting month:', error)
        throw error
      }
    },

    async updateCurrency(currency: string) {
      try {
        await $fetch('/api/user/currency', {
          method: 'PUT',
          body: { currency },
        })

        if (!this.data) return

        this.data = {
          ...this.data,
          user: {
            ...this.data.user,
            mainCurrency: currency,
          },
        }
      }
      catch (error) {
        console.error('Error updating currency:', error)
        throw error
      }
    },

    getNextMonth(): { year: number, month: number } {
      return getNextMonth(this.data?.months || [])
    },

    getPreviousMonth(): { year: number, month: number } {
      return getPreviousMonth(this.data?.months || [])
    },

    async exportBudget() {
      try {
        const response = await $fetch('/api/budget/export', {
          method: 'GET',
          responseType: 'blob',
        })

        const blob = new Blob([JSON.stringify(response)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = `budget-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
      catch (error) {
        console.error('Error exporting budget:', error)
        throw error
      }
    },

    $reset() {
      this.data = null
      this.isLoading = false
      this.error = null
      this.canEdit = false
      this.canView = false
    },
  },
})
