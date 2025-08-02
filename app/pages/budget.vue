<template>
  <div class="min-h-screen bg-base-100">
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
        {{ isCreatingCurrentMonth ? 'Создание месяца...' : `📅 Создать ${monthNames[currentMonth]} ${currentYear}` }}
      </button>
    </div>

    <div v-else>
      <ul class="timeline timeline-vertical [--timeline-col-start:15ch]">
        <BudgetYearSection
          v-for="year in years"
          :key="year"
          :year="year"
          :months="groupedData[year]"
          :month-names="monthNames"
          :exchange-rates="exchangeRates"
        />
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MonthData } from '~~/shared/types/budget'

const monthNames = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth()

const isCreatingCurrentMonth = ref(false)

const exchangeRates = ref({
  '2025-01-01': { USD: 1, EUR: 0.85, RUB: 95 },
  '2025-02-01': { USD: 1, EUR: 0.84, RUB: 96 },
})

const monthsData = ref<MonthData[]>([
  {
    year: 2025,
    month: 0,
    userMonthId: '1',
    balanceSources: [
      { id: '1', name: 'Сбербанк', currency: 'RUB', amount: 150000 },
      { id: '2', name: 'Тинькофф', currency: 'RUB', amount: 75000 },
      { id: '3', name: 'Наличные', currency: 'USD', amount: 500 },
    ],
    incomeEntries: [
      { id: '1', description: 'Зарплата', amount: 120000, currency: 'RUB', date: '2025-01-15' },
      { id: '2', description: 'Фриланс', amount: 800, currency: 'USD', date: '2025-01-20' },
    ],
    expenseEntries: [
      { id: '1', description: 'Аренда квартиры', amount: 45000, currency: 'RUB', date: '2025-01-01' },
      { id: '2', description: 'Продукты', amount: 25000, currency: 'RUB', date: '2025-01-10' },
    ],
    balanceChange: 1500,
    pocketExpenses: 15000,
    income: 120000,
  },
  {
    year: 2024,
    month: 11,
    userMonthId: '2',
    balanceSources: [
      { id: '3', name: 'Сбербанк', currency: 'RUB', amount: 140000 },
      { id: '4', name: 'Тинькофф', currency: 'RUB', amount: 65000 },
    ],
    incomeEntries: [
      { id: '3', description: 'Зарплата', amount: 115000, currency: 'RUB', date: '2024-12-15' },
      { id: '4', description: 'Бонус', amount: 30000, currency: 'RUB', date: '2024-12-30' },
    ],
    expenseEntries: [
      { id: '3', description: 'Аренда квартиры', amount: 43000, currency: 'RUB', date: '2024-12-01' },
      { id: '4', description: 'Новый год', amount: 40000, currency: 'RUB', date: '2024-12-25' },
    ],
    balanceChange: -2000,
    pocketExpenses: 18000,
    income: 115000,
  },
])

const groupedData = computed(() => {
  return monthsData.value.reduce((acc, month) => {
    if (!acc[month.year]) {
      acc[month.year] = []
    }
    acc[month.year].push(month)
    return acc
  }, {} as Record<number, MonthData[]>)
})

const years = computed(() => {
  return Object.keys(groupedData.value)
    .map(Number)
    .sort((a, b) => b - a)
})

const createCurrentMonth = async (): Promise<void> => {
  isCreatingCurrentMonth.value = true

  try {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newMonth: MonthData = {
      year: currentYear,
      month: currentMonth,
      userMonthId: String(Date.now()),
      balanceSources: [],
      incomeEntries: [],
      expenseEntries: [],
      balanceChange: 0,
      pocketExpenses: 0,
      income: 0,
    }

    monthsData.value.unshift(newMonth)
  }
  catch (error) {
    console.error('Ошибка создания месяца:', error)
  }
  finally {
    isCreatingCurrentMonth.value = false
  }
}
</script>
