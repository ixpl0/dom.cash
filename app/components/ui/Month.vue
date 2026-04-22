<template>
  <div
    class="group w-fit mx-auto rounded-box bg-base-200/50 hover:bg-base-200 border-2 transition-all duration-200"
    :class="props.isCurrentMonth ? 'border-primary' : 'border-transparent'"
    data-testid="budget-month"
  >
    <div class="flex items-center gap-4 px-4 py-2">
      <div
        class="tooltip capitalize w-28 flex-shrink-0"
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

      <div class="flex gap-4">
        <div
          :ref="setCardRef(0)"
          class="tooltip text-center"
          :data-tip="balanceTooltip"
        >
          <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
            <button
              class="btn btn-ghost text-2xl"
              :class="{
                'text-primary': data.startBalance !== null && data.startBalance !== 0,
                'text-base-content': data.startBalance === null || data.startBalance === 0,
              }"
              :disabled="isReadOnly || data.startBalance === null"
              data-testid="balance-button"
              @click="$emit('balanceClick')"
            >
              {{ data.startBalance !== null ? formatAmount(data.startBalance) : '—' }}
            </button>
          </div>
        </div>

        <div
          v-if="!isPlanningMode"
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
          v-if="!isPlanningMode"
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
          v-if="!isPlanningMode"
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
          v-if="!isPlanningMode"
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
          v-if="!isPlanningMode"
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
          v-if="!isPlanningMode"
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
          v-if="isPlanningMode"
          :ref="setCardRef(8)"
          class="tooltip text-center"
          :data-tip="plannedBalanceChangeTooltip"
        >
          <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
            <button
              class="btn btn-ghost text-xl flex flex-col gap-0 leading-tight h-auto py-2"
              data-testid="planned-balance-change-button"
              :class="{
                'text-warning': data.plannedBalanceChange !== null && data.plannedBalanceChange < 0,
                'text-info': data.plannedBalanceChange !== null && data.plannedBalanceChange > 0,
                'text-base-content': data.plannedBalanceChange === null || data.plannedBalanceChange === 0,
              }"
              :disabled="isReadOnly || isPastMonth"
              @click="$emit('planClick', 'amount')"
            >
              <span>{{ planMainText }}</span>
              <span
                v-if="isPastMonth && data.plannedVsActualDiff !== null"
                class="text-xs opacity-80"
                :class="{
                  'text-success': data.plannedVsActualDiff > 0,
                  'text-error': data.plannedVsActualDiff < 0,
                  'text-base-content': data.plannedVsActualDiff === 0,
                }"
              >
                {{ data.plannedVsActualDiff > 0 ? '+' : '' }}{{ formatAmount(data.plannedVsActualDiff) }}
              </span>
            </button>
          </div>
        </div>

        <div
          v-if="isPlanningMode"
          :ref="setCardRef(9)"
          class="tooltip text-center"
          :data-tip="expectedBalanceTooltip"
        >
          <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
            <button
              class="btn btn-ghost text-2xl"
              disabled
              data-testid="expected-balance-button"
              :class="{
                'text-primary': data.expectedBalance !== null && data.expectedBalance > 0,
                'text-error': data.expectedBalance !== null && data.expectedBalance < 0,
                'text-base-content': data.expectedBalance === null || data.expectedBalance === 0,
              }"
            >
              {{ data.expectedBalance !== null ? formatAmount(data.expectedBalance) : '—' }}
            </button>
          </div>
        </div>

        <div
          v-if="isPlanningMode"
          :ref="setCardRef(10)"
          class="text-center"
          :class="{ tooltip: data.planComment !== null && data.planComment !== '' }"
          :data-tip="data.planComment || undefined"
        >
          <div class="column-content w-fit max-w-xs mx-auto">
            <button
              type="button"
              class="btn btn-ghost normal-case font-normal text-left w-full max-w-xs px-3 py-2 h-auto min-h-0"
              :disabled="isReadOnly || isPastMonth"
              data-testid="plan-comment-button"
              @click="$emit('planClick', 'comment')"
            >
              <span
                v-if="data.planComment"
                class="block text-sm text-base-content truncate w-full"
                data-testid="plan-comment-text"
              >
                {{ data.planComment }}
              </span>
              <span
                v-else
                class="block text-xl text-base-content/50 text-center w-full"
                data-testid="plan-comment-empty"
              >
                —
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        :ref="setCardRef(11)"
        class="w-10 flex justify-center"
      >
        <div
          v-if="canDelete"
          class="tooltip text-center"
          :data-tip="labels.deleteMonth"
        >
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
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { timelineColumnsSyncKey } from '~/types/timeline'

export interface UiMonthData {
  startBalance: number | null
  totalIncome: number
  totalExpenses: number
  totalOptionalExpenses: number
  calculatedPocketExpenses: number | null
  totalAllExpenses: number | null
  calculatedBalanceChange: number | null
  currencyProfitLoss: number | null
  plannedBalanceChange: number | null
  plannedVsActualDiff: number | null
  expectedBalance: number | null
  planComment: string | null
}

export interface UiMonthLabels {
  deleteMonth: string
  addPlan: string
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
  plannedBalanceChangeTooltip: string
  expectedBalanceTooltip: string
  data: UiMonthData
  labels: UiMonthLabels
  isCurrentMonth?: boolean
  isReadOnly?: boolean
  canDelete?: boolean
  isPlanningMode?: boolean
  isPastMonth?: boolean
  formatAmount: (amount: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  isCurrentMonth: false,
  isReadOnly: false,
  canDelete: false,
  isPlanningMode: false,
  isPastMonth: false,
})

defineEmits<{
  balanceClick: []
  incomeClick: []
  expenseClick: []
  currencyRatesClick: []
  deleteClick: []
  planClick: [focusField: 'amount' | 'comment']
}>()

const planMainText = computed(() => {
  if (props.data.plannedBalanceChange !== null) {
    return props.formatAmount(props.data.plannedBalanceChange)
  }
  if (props.isPastMonth || props.isReadOnly) {
    return '—'
  }
  return props.labels.addPlan
})

const columnsSync = inject(timelineColumnsSyncKey, null)

const cardRefs = ref<HTMLElement[]>([])

const setCardRef = (index: number) => (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLElement) {
    cardRefs.value[index] = el
  }
}

onMounted(() => {
  nextTick(() => {
    const validRefs = cardRefs.value.filter(Boolean)
    if (validRefs.length && columnsSync) {
      columnsSync.registerRow(validRefs)
    }
  })
})

onUnmounted(() => {
  const validRefs = cardRefs.value.filter(Boolean)
  if (validRefs.length && columnsSync) {
    columnsSync.unregisterRow(validRefs)
  }
})
</script>
