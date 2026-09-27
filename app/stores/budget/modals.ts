import type { EntryKind } from '~~/shared/types'

interface EntryModalState {
  isOpen: boolean
  monthId: string | null
  entryKind: EntryKind | null
  isReadOnly: boolean
}

interface CurrencyRatesModalState {
  isOpen: boolean
  monthTitle: string
  rates: Record<string, number>
  isUsingOtherMonthRates: boolean
  sourceMonthTitle?: string
  missingRateCurrencies: string[]
}

interface ChartModalState {
  isOpen: boolean
}

interface ShareModalState {
  isOpen: boolean
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
  currentComment: string | null
  focusField: 'amount' | 'comment'
}

export const useModalsStore = defineStore('modals', () => {
  const entryModal = ref<EntryModalState>({
    isOpen: false,
    monthId: null,
    entryKind: null,
    isReadOnly: false,
  })

  const currencyRatesModal = ref<CurrencyRatesModalState>({
    isOpen: false,
    monthTitle: '',
    rates: {},
    isUsingOtherMonthRates: false,
    sourceMonthTitle: undefined,
    missingRateCurrencies: [],
  })

  const chartModal = ref<ChartModalState>({
    isOpen: false,
  })

  const shareModal = ref<ShareModalState>({
    isOpen: false,
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
    currentComment: null,
    focusField: 'amount',
  })

  const openEntryModal = (params: {
    monthId: string
    entryKind: EntryKind
    isReadOnly: boolean
  }) => {
    entryModal.value = {
      isOpen: true,
      monthId: params.monthId,
      entryKind: params.entryKind,
      isReadOnly: params.isReadOnly,
    }
  }

  const closeEntryModal = () => {
    entryModal.value = {
      ...entryModal.value,
      isOpen: false,
    }
  }

  const openCurrencyRatesModal = (params: {
    monthTitle: string
    rates: Record<string, number>
    isUsingOtherMonthRates: boolean
    sourceMonthTitle?: string
    missingRateCurrencies: string[]
  }) => {
    currencyRatesModal.value = {
      isOpen: true,
      monthTitle: params.monthTitle,
      rates: params.rates,
      isUsingOtherMonthRates: params.isUsingOtherMonthRates,
      sourceMonthTitle: params.sourceMonthTitle,
      missingRateCurrencies: params.missingRateCurrencies,
    }
  }

  const closeCurrencyRatesModal = () => {
    currencyRatesModal.value = {
      ...currencyRatesModal.value,
      isOpen: false,
    }
  }

  const openChartModal = () => {
    chartModal.value = { isOpen: true }
  }

  const closeChartModal = () => {
    chartModal.value = { isOpen: false }
  }

  const openShareModal = () => {
    shareModal.value = { isOpen: true }
  }

  const closeShareModal = () => {
    shareModal.value = { isOpen: false }
  }

  const openSharedBudgetsModal = () => {
    sharedBudgetsModal.value = { isOpen: true }
  }

  const closeSharedBudgetsModal = () => {
    sharedBudgetsModal.value = { isOpen: false }
  }

  const openPlanModal = (params: {
    year: number
    month: number
    monthTitle: string
    currentValue: number | null
    currentComment: string | null
    focusField?: 'amount' | 'comment'
  }) => {
    planModal.value = {
      isOpen: true,
      year: params.year,
      month: params.month,
      monthTitle: params.monthTitle,
      currentValue: params.currentValue,
      currentComment: params.currentComment,
      focusField: params.focusField ?? 'amount',
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
