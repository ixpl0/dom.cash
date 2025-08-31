<template>
  <dialog
    ref="modal"
    class="modal"
    @close="handleDialogClose"
  >
    <div class="modal-box w-11/12 max-w-3xl max-h-[90vh] flex flex-col">
      <button
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="hide()"
      >
        ✕
      </button>

      <h3 class="font-bold text-lg mb-4 flex-shrink-0">
        Курсы валют за {{ currencyRatesModal.monthTitle }}
      </h3>

      <div
        v-if="currencyRatesModal.isUsingOtherMonthRates"
        class="alert alert-warning mb-4 flex-shrink-0"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="stroke-current shrink-0 h-6 w-6"
          viewBox="0 0 24 24"
        >
          <path
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>У этого месяца нет собственных курсов валют, поэтому используются курсы из {{ currencyRatesModal.sourceMonthTitle }}</span>
      </div>

      <div class="form-control mb-4 flex-shrink-0">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск валюты по коду или названию..."
          class="input input-bordered w-full"
        >
      </div>

      <div class="space-y-2 flex-1 overflow-y-auto min-h-0">
        <div
          v-if="filteredRates.length === 0"
          class="text-center py-8 text-base-content/60"
        >
          Валюты не найдены
        </div>
        <div
          v-else
          class="grid grid-cols-1 gap-2"
        >
          <div
            v-for="rate in filteredRates"
            :key="rate.code"
            class="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="font-semibold text-lg">{{ rate.code }}</span>
              <span class="text-sm opacity-70">{{ rate.name }}</span>
            </div>
            <span class="font-mono text-lg">{{ formatRate(rate.rate) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div
      class="modal-backdrop"
      @click="hide"
    />
  </dialog>
</template>

<script setup lang="ts">
import { filterCurrencies } from '~~/shared/utils/currencies'
import { useRecentCurrencies } from '~~/app/composables/useRecentCurrencies'
import { useModalsStore } from '~/stores/modals'

interface CurrencyRate {
  code: string
  name: string
  rate: number
}

const modalsStore = useModalsStore()
const currencyRatesModal = computed(() => modalsStore.currencyRatesModal)

const modal = ref<HTMLDialogElement>()
const searchQuery = ref('')

const { getRecentCurrencies } = useRecentCurrencies()
const recentCurrencies = getRecentCurrencies()

const allRates = computed((): CurrencyRate[] => {
  if (!currencyRatesModal.value.rates) {
    return []
  }

  const currencies = filterCurrencies('', [...recentCurrencies.value])

  return currencies
    .map(currency => ({
      code: currency.code,
      name: currency.name,
      rate: currencyRatesModal.value.rates[currency.code] || 0,
    }))
    .filter(rate => rate.rate > 0)
})

const filteredRates = computed((): CurrencyRate[] => {
  if (!searchQuery.value.trim()) {
    return allRates.value
  }

  const query = searchQuery.value.toLowerCase().trim()

  return allRates.value.filter(rate =>
    rate.code.toLowerCase().includes(query)
    || rate.name.toLowerCase().includes(query),
  )
})

const formatRate = (rate: number): string => {
  if (rate >= 1000) {
    return String(Math.round(rate))
  }
  if (rate >= 10) {
    return rate.toFixed(2)
  }
  if (rate >= 1) {
    return rate.toFixed(4)
  }
  return rate.toFixed(6)
}

const hide = (): void => {
  modalsStore.closeCurrencyRatesModal()
}

const handleDialogClose = (): void => {
  searchQuery.value = ''
  modalsStore.closeCurrencyRatesModal()
}

watch(() => currencyRatesModal.value.isOpen, (isOpen) => {
  if (isOpen) {
    searchQuery.value = ''
    modal.value?.showModal()
  }
  else {
    modal.value?.close()
  }
})
</script>
