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

    <ul
      v-else
      class="timeline timeline-vertical [--timeline-col-start:15ch]"
    >
      <YearSection
        v-for="year in years"
        :key="year"
        :year="year"
        :months="groupedData[year]"
        :month-names="monthNames"
        :exchange-rates="currentMonthRates"
        :base-currency="baseCurrency"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { MonthData } from '~~/shared/types/budget'
import YearSection from '~/components/budget/YearSection.vue'

const monthNames = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth()

const isCreatingCurrentMonth = ref(false)
const baseCurrency = ref('RUB')

const monthsData = ref<MonthData[]>([
  {
    userMonthId: '1',
    year: 2025,
    month: 6,
    balanceChange: 15000,
    income: 120000,
    pocketExpenses: 25000,
    balanceSources: [
      { id: '1', name: 'Накопления', currency: 'RUB', amount: 500000 },
      { id: '2', name: 'Доллары', currency: 'USD', amount: 2000 },
    ],
    incomeEntries: [
      { id: '1', description: 'Зарплата', currency: 'RUB', amount: 100000, date: '2025-07-15' },
      { id: '2', description: 'Фриланс', currency: 'USD', amount: 200, date: '2025-07-20' },
    ],
    expenseEntries: [
      { id: '1', description: 'Аренда квартиры', currency: 'RUB', amount: 45000, date: '2025-07-01' },
      { id: '2', description: 'Продукты', currency: 'RUB', amount: 15000, date: '2025-07-10' },
    ],
  },
  {
    userMonthId: '2',
    year: 2025,
    month: 5,
    balanceChange: -5000,
    income: 110000,
    pocketExpenses: 30000,
    balanceSources: [
      { id: '3', name: 'Накопления', currency: 'RUB', amount: 485000 },
      { id: '4', name: 'Доллары', currency: 'USD', amount: 2000 },
    ],
    incomeEntries: [
      { id: '3', description: 'Зарплата', currency: 'RUB', amount: 100000, date: '2025-06-15' },
      { id: '4', description: 'Бонус', currency: 'RUB', amount: 10000, date: '2025-06-30' },
    ],
    expenseEntries: [
      { id: '3', description: 'Аренда квартиры', currency: 'RUB', amount: 45000, date: '2025-06-01' },
      { id: '4', description: 'Отпуск', currency: 'RUB', amount: 70000, date: '2025-06-15' },
    ],
  },
  {
    userMonthId: '3',
    year: 2024,
    month: 11,
    balanceChange: 25000,
    income: 95000,
    pocketExpenses: 20000,
    balanceSources: [
      { id: '5', name: 'Накопления', currency: 'RUB', amount: 460000 },
      { id: '6', name: 'Доллары', currency: 'USD', amount: 1800 },
    ],
    incomeEntries: [
      { id: '5', description: 'Зарплата', currency: 'RUB', amount: 95000, date: '2024-12-15' },
    ],
    expenseEntries: [
      { id: '5', description: 'Аренда квартиры', currency: 'RUB', amount: 40000, date: '2024-12-01' },
      { id: '6', description: 'Техника', currency: 'RUB', amount: 30000, date: '2024-12-20' },
    ],
  },
])

const currentMonthRates = ref<Record<string, number>>({
  USD_RUB: 95.5,
  EUR_RUB: 105.2,
})

const groupedData = computed(() => {
  return monthsData.value.reduce((acc, month) => {
    if (!acc[month.year]) {
      acc[month.year] = []
    }
    acc[month.year].push(month)
    return acc
  }, {} as Record<number, MonthData[]>)
})

const years = computed(() =>
  Object.keys(groupedData.value)
    .map(Number)
    .sort((a, b) => b - a),
)

const createCurrentMonth = async () => {
  isCreatingCurrentMonth.value = true

  try {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newMonth: MonthData = {
      userMonthId: String(Date.now()),
      year: currentYear,
      month: currentMonth,
      balanceChange: 0,
      income: 0,
      pocketExpenses: 0,
      balanceSources: [],
      incomeEntries: [],
      expenseEntries: [],
    }

    monthsData.value.unshift(newMonth)
  }
  catch (error) {
    console.error('Error creating current month:', error)
  }
  finally {
    isCreatingCurrentMonth.value = false
  }
}
</script>
