<template>
  <UiDialog
    :is-open="isOpen"
    data-testid="currency-rates-modal"
    content-class="modal-box w-11/12 max-w-3xl max-h-[90vh] flex flex-col"
    @close="hide"
  >
    <button
      type="button"
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
      data-testid="modal-close-button"
      @click="hide()"
    >
      <Icon
        name="heroicons:x-mark"
        size="20"
      />
    </button>

    <h3 class="font-bold text-lg mb-4 flex-shrink-0 pr-6">
      Курсы валют за {{ currencyRatesModal.monthTitle }}
    </h3>

    <div
      v-if="currencyRatesModal.isUsingOtherMonthRates"
      class="alert alert-warning alert-outline mb-4 flex-shrink-0"
    >
      <Icon
        name="heroicons:exclamation-triangle"
        size="24"
        class="stroke-current shrink-0"
      />
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
          class="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors gap-3"
        >
          <div class="font-semibold text-lg">
            {{ rate.code }}
          </div>
          <div class="text-sm opacity-70 text-center">
            {{ rate.name }}
          </div>
          <div
            class="font-mono text-lg"
            :data-testid="`rate-${rate.code}`"
          >
            {{ formatRate(rate.rate) }}
          </div>
        </div>
      </div>
    </div>
  </UiDialog>
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
const isOpen = computed(() => currencyRatesModal.value.isOpen)

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
  searchQuery.value = ''
  modalsStore.closeCurrencyRatesModal()
}

watch(isOpen, (open) => {
  if (open) {
    searchQuery.value = ''
  }
})
</script>
