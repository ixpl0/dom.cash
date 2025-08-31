interface EntryModalState {
  isOpen: boolean
  monthId: string | null
  entryKind: 'balance' | 'income' | 'expense' | null
  isReadOnly: boolean
  targetUsername?: string
}

interface CurrencyRatesModalState {
  isOpen: boolean
  monthId: number | null
  monthTitle: string
  rates: Record<string, number>
  isUsingOtherMonthRates: boolean
  sourceMonthTitle?: string
}

interface ModalsState {
  entryModal: EntryModalState
  currencyRatesModal: CurrencyRatesModalState
}

export const useModalsStore = defineStore('modals', {
  state: (): ModalsState => ({
    entryModal: {
      isOpen: false,
      monthId: null,
      entryKind: null,
      isReadOnly: false,
      targetUsername: undefined,
    },
    currencyRatesModal: {
      isOpen: false,
      monthId: null,
      monthTitle: '',
      rates: {},
      isUsingOtherMonthRates: false,
      sourceMonthTitle: undefined,
    },
  }),

  actions: {
    openEntryModal(params: {
      monthId: string
      entryKind: 'balance' | 'income' | 'expense'
      isReadOnly: boolean
      targetUsername?: string
    }) {
      this.$patch({
        entryModal: {
          isOpen: true,
          monthId: params.monthId,
          entryKind: params.entryKind,
          isReadOnly: params.isReadOnly,
          targetUsername: params.targetUsername,
        },
      })
    },

    closeEntryModal() {
      this.$patch({
        entryModal: {
          ...this.entryModal,
          isOpen: false,
        },
      })
    },

    openCurrencyRatesModal(params: {
      monthId: number
      monthTitle: string
      rates: Record<string, number>
      isUsingOtherMonthRates: boolean
      sourceMonthTitle?: string
    }) {
      this.$patch({
        currencyRatesModal: {
          isOpen: true,
          monthId: params.monthId,
          monthTitle: params.monthTitle,
          rates: params.rates,
          isUsingOtherMonthRates: params.isUsingOtherMonthRates,
          sourceMonthTitle: params.sourceMonthTitle,
        },
      })
    },

    closeCurrencyRatesModal() {
      this.$patch({
        currencyRatesModal: {
          ...this.currencyRatesModal,
          isOpen: false,
        },
      })
    },
  },
})
