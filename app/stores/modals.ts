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

export const useModalsStore = defineStore('modals', () => {
  const entryModal = ref<EntryModalState>({
    isOpen: false,
    monthId: null,
    entryKind: null,
    isReadOnly: false,
    targetUsername: undefined,
  })

  const currencyRatesModal = ref<CurrencyRatesModalState>({
    isOpen: false,
    monthId: null,
    monthTitle: '',
    rates: {},
    isUsingOtherMonthRates: false,
    sourceMonthTitle: undefined,
  })

  const modalTeleportTarget = ref<HTMLElement | null>(null)

  const openEntryModal = (params: {
    monthId: string
    entryKind: 'balance' | 'income' | 'expense'
    isReadOnly: boolean
    targetUsername?: string
  }) => {
    entryModal.value = {
      isOpen: true,
      monthId: params.monthId,
      entryKind: params.entryKind,
      isReadOnly: params.isReadOnly,
      targetUsername: params.targetUsername,
    }
  }

  const closeEntryModal = () => {
    entryModal.value = {
      ...entryModal.value,
      isOpen: false,
    }
  }

  const openCurrencyRatesModal = (params: {
    monthId: number
    monthTitle: string
    rates: Record<string, number>
    isUsingOtherMonthRates: boolean
    sourceMonthTitle?: string
  }) => {
    currencyRatesModal.value = {
      isOpen: true,
      monthId: params.monthId,
      monthTitle: params.monthTitle,
      rates: params.rates,
      isUsingOtherMonthRates: params.isUsingOtherMonthRates,
      sourceMonthTitle: params.sourceMonthTitle,
    }
  }

  const closeCurrencyRatesModal = () => {
    currencyRatesModal.value = {
      ...currencyRatesModal.value,
      isOpen: false,
    }
  }

  const setModalTeleportTarget = (target: HTMLElement | null) => {
    modalTeleportTarget.value = target
  }

  return {
    entryModal,
    currencyRatesModal,
    modalTeleportTarget,
    openEntryModal,
    closeEntryModal,
    openCurrencyRatesModal,
    closeCurrencyRatesModal,
    setModalTeleportTarget,
  }
})
