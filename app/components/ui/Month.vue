<template>
  <li
    class="hover:bg-base-200"
    data-testid="budget-month"
  >
    <hr>
    <div class="timeline-start">
      <div class="flex items-center gap-1">
        <Transition
          enter-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
        >
          <div
            v-if="props.isCurrentMonth"
            class="tooltip flex items-center justify-center"
            :data-tip="labels.currentMonth"
          >
            <Icon
              name="heroicons:play-solid"
              size="14"
              class="text-primary"
            />
          </div>
        </Transition>
        <div
          class="tooltip capitalize"
          :data-tip="monthBadgeTooltip"
        >
          <button
            class="badge badge-ghost badge-lg uppercase hover:badge-primary cursor-pointer"
            data-testid="month-badge"
            @click="$emit('currencyRatesClick')"
          >
            {{ monthName }}
          </button>
        </div>
      </div>
    </div>

    <div class="timeline-middle">
      <Icon
        name="heroicons:check-circle-solid"
        size="20"
      />
    </div>

    <div class="timeline-end flex gap-4 pl-4 py-1">
      <div
        :ref="setCardRef(0)"
        class="tooltip text-center"
        :data-tip="balanceTooltip"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl"
            :class="{
              'text-primary': data.startBalance !== 0,
              'text-base-content': data.startBalance === 0,
            }"
            :disabled="isReadOnly"
            data-testid="balance-button"
            @click="$emit('balanceClick')"
          >
            {{ formatAmount(data.startBalance) }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(1)"
        class="tooltip text-center"
        :data-tip="incomeTooltip"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl"
            :class="{
              'text-success': data.totalIncome !== 0,
              'text-base-content': data.totalIncome === 0,
            }"
            :disabled="isReadOnly"
            data-testid="incomes-button"
            @click="$emit('incomeClick')"
          >
            {{ formatAmount(data.totalIncome) }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(2)"
        class="tooltip text-center"
        :data-tip="expensesTooltip"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl"
            :class="{
              'text-error': data.totalExpenses !== 0,
              'text-base-content': data.totalExpenses === 0,
            }"
            :disabled="isReadOnly"
            data-testid="expenses-button"
            @click="$emit('expenseClick')"
          >
            {{ formatAmount(data.totalExpenses) }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(3)"
        class="tooltip text-center"
        :data-tip="pocketExpensesTooltip"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            disabled
            data-testid="pocket-expenses-button"
            :class="{
              'text-warning': data.calculatedPocketExpenses !== null && data.calculatedPocketExpenses < 0,
              'text-error': data.calculatedPocketExpenses !== null && data.calculatedPocketExpenses > 0,
              'text-base-content': data.calculatedPocketExpenses === 0,
            }"
          >
            {{ data.calculatedPocketExpenses !== null ? formatAmount(data.calculatedPocketExpenses) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(4)"
        class="tooltip text-center"
        :data-tip="totalExpensesTooltip"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            disabled
            data-testid="total-expenses-button"
            :class="{
              'text-warning': data.totalAllExpenses !== null && data.totalAllExpenses < 0,
              'text-error': data.totalAllExpenses !== null && data.totalAllExpenses > 0,
              'text-base-content': data.totalAllExpenses === 0,
            }"
          >
            {{ data.totalAllExpenses !== null ? formatAmount(data.totalAllExpenses) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(5)"
        class="tooltip text-center"
        :data-tip="balanceChangeTooltip"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            data-testid="balance-change-button"
            :class="{
              'text-success': data.calculatedBalanceChange !== null && data.calculatedBalanceChange > 0,
              'text-error': data.calculatedBalanceChange !== null && data.calculatedBalanceChange < 0,
              'text-base-content': data.calculatedBalanceChange === 0,
            }"
            disabled
          >
            {{ data.calculatedBalanceChange !== null ? formatAmount(data.calculatedBalanceChange) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(6)"
        class="tooltip text-center"
        :data-tip="currencyFluctuationTooltip"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            data-testid="currency-fluctuation-button"
            :class="{
              'text-success': data.currencyProfitLoss !== null && data.currencyProfitLoss > 0,
              'text-error': data.currencyProfitLoss !== null && data.currencyProfitLoss < 0,
              'text-base-content': data.currencyProfitLoss === 0,
            }"
            disabled
          >
            {{ data.currencyProfitLoss !== null ? formatAmount(data.currencyProfitLoss) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(7)"
        class="tooltip text-center"
        :data-tip="optionalExpensesTooltip"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            data-testid="optional-expenses-button"
            :class="{
              'text-error': data.totalOptionalExpenses !== 0,
              'text-base-content': data.totalOptionalExpenses === 0,
            }"
            disabled
          >
            {{ formatAmount(data.totalOptionalExpenses) }}
          </button>
        </div>
      </div>

      <div
        v-if="canDelete"
        :ref="setCardRef(8)"
        class="tooltip text-center"
        :data-tip="labels.deleteMonth"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost btn-sm hover:bg-error hover:text-white"
            data-testid="delete-month-button"
            @click="$emit('deleteClick')"
          >
            <Icon
              name="heroicons:trash"
              size="16"
            />
          </button>
        </div>
      </div>
    </div>

    <hr>
  </li>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'

export interface UiMonthData {
  startBalance: number
  totalIncome: number
  totalExpenses: number
  totalOptionalExpenses: number
  calculatedPocketExpenses: number | null
  totalAllExpenses: number | null
  calculatedBalanceChange: number | null
  currencyProfitLoss: number | null
}

export interface UiMonthLabels {
  currentMonth: string
  deleteMonth: string
}

interface Props {
  monthName: string
  monthBadgeTooltip: string
  balanceTooltip: string
  incomeTooltip: string
  expensesTooltip: string
  pocketExpensesTooltip: string
  totalExpensesTooltip: string
  balanceChangeTooltip: string
  currencyFluctuationTooltip: string
  optionalExpensesTooltip: string
  data: UiMonthData
  labels: UiMonthLabels
  isCurrentMonth?: boolean
  isReadOnly?: boolean
  canDelete?: boolean
  formatAmount: (amount: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  isCurrentMonth: false,
  isReadOnly: false,
  canDelete: false,
})

const emit = defineEmits<{
  balanceClick: []
  incomeClick: []
  expenseClick: []
  currencyRatesClick: []
  deleteClick: []
  cardRefsReady: [refs: HTMLElement[]]
  cardRefsRemoved: [refs: HTMLElement[]]
}>()

const cardRefs = ref<HTMLElement[]>([])

const setCardRef = (index: number) => (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLElement) {
    cardRefs.value[index] = el
  }
}

onMounted(() => {
  nextTick(() => {
    const validRefs = cardRefs.value.filter(Boolean)
    if (validRefs.length) {
      emit('cardRefsReady', validRefs)
    }
  })
})

onUnmounted(() => {
  const validRefs = cardRefs.value.filter(Boolean)
  if (validRefs.length) {
    emit('cardRefsRemoved', validRefs)
  }
})
</script>
