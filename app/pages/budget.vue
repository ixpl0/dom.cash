<template>
  <div class="min-h-screen bg-base-100 p-6">
    <div
      v-if="monthsData.length === 0"
      class="text-center py-12"
    >
      <div class="text-6xl mb-4">
        💰
      </div>
      <h2 class="text-2xl font-bold mb-2">
        Пока нет данных о бюджете
      </h2>
      <p class="text-lg opacity-70 mb-6">
        Начните с создания месяца и добавления источников баланса
      </p>
      <button
        class="btn btn-primary btn-lg"
        :disabled="isCreatingCurrentMonth"
        @click="createCurrentMonth"
      >
        <span
          v-if="isCreatingCurrentMonth"
          class="loading loading-spinner loading-sm"
        />
        <span v-if="!isCreatingCurrentMonth">
          📅 Создать {{ monthNames[currentMonth] }} {{ currentYear }}
        </span>
        <span v-else>Создание месяца...</span>
      </button>
    </div>

    <ul
      v-else
      class="timeline timeline-vertical [--timeline-col-start:15ch]"
    >
      <BudgetYear
        v-for="year in years"
        :key="year"
        :year="year"
        :months="groupedData[year]"
        :month-names="monthNames"
        :exchange-rates="exchangeRates"
        @update-balance="(month, entries) => onUpdateBalance(month, entries)"
        @update-income="(month, entries) => onUpdateIncome(month, entries)"
        @update-expense="(month, entries) => onUpdateExpense(month, entries)"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
import type {
  MonthData,
  BalanceSourceData,
  IncomeEntryData,
  ExpenseEntryData,
} from '~~/shared/types/budget'
import { calculateTotalBalance } from '~~/shared/utils/budget'
import { useAuthState } from '~/composables/useAuthState'

const monthNames = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth()

const { user } = useAuthState()
const baseCurrency = computed(() => user.value?.mainCurrency || 'USD')

const isCreatingCurrentMonth = ref(false)

const monthsData = ref<MonthData[]>([])

const exchangeRates = ref<Record<string, Record<string, number>>>({})

const groupedData = computed(() => {
  return monthsData.value.reduce((acc: Record<number, MonthData[]>, m) => {
    if (!acc[m.year]) {
      acc[m.year] = []
    }
    acc[m.year] = acc[m.year].concat(m)
    return acc
  }, {})
})

const years = computed(() => {
  return Object.keys(groupedData.value).map(Number).sort((a, b) => b - a)
})

const computeStats = () => {
  const sorted = [...monthsData.value].sort((a, b) => {
    if (a.year === b.year) return a.month - b.month
    return a.year - b.year
  })
  sorted.forEach((m, i) => {
    const rateDate = `${m.year}-${String(m.month + 1).padStart(2, '0')}-01`
    const rates = exchangeRates.value[rateDate] || {}
    const incomeTotal = calculateTotalBalance(
      m.incomeEntries.map(e => ({ id: e.id, name: e.description, currency: e.currency, amount: e.amount })),
      baseCurrency.value,
      rates,
    )
    const expenseTotal = calculateTotalBalance(
      m.expenseEntries.map(e => ({ id: e.id, name: e.description, currency: e.currency, amount: e.amount })),
      baseCurrency.value,
      rates,
    )
    const startBalance = calculateTotalBalance(m.balanceSources, baseCurrency.value, rates)
    const prev = sorted[i - 1]
    const prevRateDate = prev ? `${prev.year}-${String(prev.month + 1).padStart(2, '0')}-01` : ''
    const prevBalance = prev
      ? calculateTotalBalance(prev.balanceSources, baseCurrency.value, exchangeRates.value[prevRateDate] || {})
      : 0
    m.income = incomeTotal
    m.balanceChange = incomeTotal - expenseTotal
    m.pocketExpenses = prev ? prevBalance - startBalance + incomeTotal - expenseTotal : 0
  })
}

const onUpdateBalance = (
  month: MonthData,
  entries: BalanceSourceData[],
) => {
  month.balanceSources = entries
  computeStats()
}

const onUpdateIncome = (
  month: MonthData,
  entries: IncomeEntryData[],
) => {
  month.incomeEntries = entries
  computeStats()
}

const onUpdateExpense = (
  month: MonthData,
  entries: ExpenseEntryData[],
) => {
  month.expenseEntries = entries
  computeStats()
}

const fetchData = async () => {
  const data = await $fetch<{ months: MonthData[]; rates: Record<string, Record<string, number>> }>('/api/budget')
  monthsData.value = data.months
  exchangeRates.value = data.rates
  computeStats()
}

onMounted(fetchData)

watch(monthsData, computeStats, { deep: true })

const createCurrentMonth = async () => {
  isCreatingCurrentMonth.value = true
  try {
    const newMonth = await $fetch<MonthData>('/api/budget', {
      method: 'POST',
      body: { year: currentYear, month: currentMonth },
    })
    monthsData.value = monthsData.value.concat(newMonth)
  }
  finally {
    isCreatingCurrentMonth.value = false
  }
}
</script>
