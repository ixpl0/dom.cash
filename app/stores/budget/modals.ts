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

interface ChartModalState {
  isOpen: boolean
}

interface ShareModalState {
  isOpen: boolean
  monthId: string | null
}

interface SharedBudgetsModalState {
  isOpen: boolean
}

interface PlanModalState {
  isOpen: boolean
  year: number | null
  month: number | null
  monthTitle: string
  currentValue: number | null
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

  const chartModal = ref<ChartModalState>({
    isOpen: false,
  })

  const shareModal = ref<ShareModalState>({
    isOpen: false,
    monthId: null,
  })

  const sharedBudgetsModal = ref<SharedBudgetsModalState>({
    isOpen: false,
  })

  const planModal = ref<PlanModalState>({
    isOpen: false,
    year: null,
    month: null,
    monthTitle: '',
    currentValue: null,
  })

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

  const openChartModal = () => {
    chartModal.value.isOpen = true
  }

  const closeChartModal = () => {
    chartModal.value.isOpen = false
  }

  const openShareModal = (monthId: string) => {
    shareModal.value = {
      isOpen: true,
      monthId,
    }
  }

  const closeShareModal = () => {
    shareModal.value.isOpen = false
  }

  const openSharedBudgetsModal = () => {
    sharedBudgetsModal.value.isOpen = true
  }

  const closeSharedBudgetsModal = () => {
    sharedBudgetsModal.value.isOpen = false
  }

  const openPlanModal = (params: {
    year: number
    month: number
    monthTitle: string
    currentValue: number | null
  }) => {
    planModal.value = {
      isOpen: true,
      year: params.year,
      month: params.month,
      monthTitle: params.monthTitle,
      currentValue: params.currentValue,
    }
  }

  const closePlanModal = () => {
    planModal.value = {
      ...planModal.value,
      isOpen: false,
    }
  }

  return {
    entryModal,
    currencyRatesModal,
    chartModal,
    shareModal,
    sharedBudgetsModal,
    planModal,
    openEntryModal,
    closeEntryModal,
    openCurrencyRatesModal,
    closeCurrencyRatesModal,
    openChartModal,
    closeChartModal,
    openShareModal,
    closeShareModal,
    openSharedBudgetsModal,
    closeSharedBudgetsModal,
    openPlanModal,
    closePlanModal,
  }
})
