<template>
  <li>
    <hr>
    <div class="timeline-start">
      <div
        class="tooltip capitalize"
        :data-tip="`${monthNames[monthData.month]} ${monthData.year}`"
      >
        <div class="badge badge-ghost badge-lg uppercase">
          {{ monthNames[monthData.month] }}
        </div>
      </div>
    </div>

    <div class="timeline-middle">
      <svg
        class="h-5 w-5"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          clip-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          fill="currentColor"
          fill-rule="evenodd"
        />
      </svg>
    </div>

    <div class="timeline-end stats shadow">
      <div class="stat place-items-center">
        <div class="stat-title">
          Баланс на начало месяца
        </div>
        <div class="stat-value text-primary">
          <div
            class="tooltip tooltip-right font-normal"
            :data-tip="`Сумма всех сбережений на начало месяца. Этого хватило бы на ${Math.floor(startBalance / 3500)} мес`"
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              @click="openBalanceModal"
            >
              {{ formatAmount(startBalance, baseCurrency) }}
            </button>
          </div>
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title text-center">
          Изменение баланса
        </div>
        <div class="stat-value">
          <div
            class="tooltip tooltip-right font-normal"
            data-tip="Разница между доходами и расходами за месяц"
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              :class="getBalanceChangeClass(monthData.balanceChange)"
              disabled
            >
              {{ formatAmount(monthData.balanceChange, baseCurrency) }}
            </button>
          </div>
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">
          Доходы
        </div>
        <div class="stat-value text-success">
          <div
            class="tooltip tooltip-left font-normal"
            :data-tip="`Все доходы за ${monthNames[monthData.month]} ${monthData.year}. Это зарплата, бонусы, подарки и т.д.`"
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              @click="openIncomeModal"
            >
              {{ formatAmount(totalIncome, baseCurrency) }}
            </button>
          </div>
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">
          Крупные расходы
        </div>
        <div class="stat-value text-error">
          <div
            class="tooltip tooltip-left font-normal"
            :data-tip="`Все крупные расходы за ${monthNames[monthData.month]} ${monthData.year}. Это оплата квартиры, покупка техники, путешествия и т.д.`"
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              @click="openExpenseModal"
            >
              {{ formatAmount(totalExpenses, baseCurrency) }}
            </button>
          </div>
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title text-center">
          Карманные расходы
        </div>
        <div class="stat-value">
          <div
            class="tooltip tooltip-left font-normal"
            data-tip="Всё, что осталось после вычета крупных расходов из общих расходов. Это деньги на еду, оплату подписок, мелкие покупки и т.д."
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              :class="getPocketExpensesClass(monthData.pocketExpenses, monthData.income)"
              disabled
            >
              {{ formatAmount(monthData.pocketExpenses, baseCurrency) }}
            </button>
          </div>
        </div>
      </div>
      <EntryModal
        v-model="balanceModalOpen"
        kind="balance"
        :entries="monthData.balanceSources"
        :month-id="monthData.userMonthId"
        :base-currency="baseCurrency"
        :rates="currentMonthRates"
        @change="updateBalance"
      />
      <EntryModal
        v-model="incomeModalOpen"
        kind="income"
        :entries="monthData.incomeEntries"
        :month-id="monthData.userMonthId"
        :base-currency="baseCurrency"
        :rates="currentMonthRates"
        @change="updateIncome"
      />
      <EntryModal
        v-model="expenseModalOpen"
        kind="expense"
        :entries="monthData.expenseEntries"
        :month-id="monthData.userMonthId"
        :base-currency="baseCurrency"
        :rates="currentMonthRates"
        @change="updateExpense"
      />
    </div>
    <hr>
  </li>
</template>

<script setup lang="ts">
import type {
  MonthData,
  BalanceSourceData,
  IncomeEntryData,
  ExpenseEntryData,
} from '~~/shared/types/budget'
import {
  formatAmount,
  calculateTotalBalance,
  getBalanceChangeClass,
  getPocketExpensesClass,
} from '~~/shared/utils/budget'
import EntryModal from '~/components/budget/EntryModal.vue'
import { useAuthState } from '~/composables/useAuthState'

interface Props {
  monthData: MonthData
  monthNames: string[]
  exchangeRates: Record<string, number>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'updateBalance', entries: BalanceSourceData[]): void
  (e: 'updateIncome', entries: IncomeEntryData[]): void
  (e: 'updateExpense', entries: ExpenseEntryData[]): void
}>()

const { user } = useAuthState()
const baseCurrency = computed(() => user.value?.mainCurrency || 'USD')

const currentMonthRates = computed(() => {
  return props.exchangeRates || {}
})

const startBalance = computed(() => {
  return calculateTotalBalance(
    props.monthData.balanceSources,
    baseCurrency.value,
    currentMonthRates.value,
  )
})

const totalIncome = computed(() => {
  return calculateTotalBalance(
    props.monthData.incomeEntries.map(entry => ({
      id: entry.id,
      name: entry.description,
      currency: entry.currency,
      amount: entry.amount,
    })),
    baseCurrency.value,
    currentMonthRates.value,
  )
})

const totalExpenses = computed(() => {
  return calculateTotalBalance(
    props.monthData.expenseEntries.map(entry => ({
      id: entry.id,
      name: entry.description,
      currency: entry.currency,
      amount: entry.amount,
    })),
    baseCurrency.value,
    currentMonthRates.value,
  )
})

const balanceModalOpen = ref(false)
const incomeModalOpen = ref(false)
const expenseModalOpen = ref(false)

const openBalanceModal = () => {
  balanceModalOpen.value = true
}

const openIncomeModal = () => {
  incomeModalOpen.value = true
}

const openExpenseModal = () => {
  expenseModalOpen.value = true
}

const updateBalance = (entries: BalanceSourceData[]) => {
  emit('updateBalance', entries)
}

const updateIncome = (entries: IncomeEntryData[]) => {
  emit('updateIncome', entries)
}

const updateExpense = (entries: ExpenseEntryData[]) => {
  emit('updateExpense', entries)
}
</script>
