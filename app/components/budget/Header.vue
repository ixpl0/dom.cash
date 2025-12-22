<template>
  <div
    class="flex items-center justify-between flex-wrap gap-4 p-6 pb-0 relative z-10"
    data-testid="budget-header"
  >
    <h1
      class="text-3xl font-bold ml-2 animate-fade-in-left"
      data-testid="budget-title"
    >
      {{ t('budget.title') }}
    </h1>

    <div
      v-if="budgetStore.data"
      class="flex items-center flex-wrap gap-2 flex-col sm:flex-row w-full sm:w-auto animate-fade-in-up-delayed"
    >
      <span
        v-if="budgetStore.data.access !== 'owner'"
        class="badge w-full sm:w-auto"
      >
        {{ t('budget.access.ownerOf') }}
        {{ budgetStore.data.user.username }}
      </span>
      <span class="badge w-full sm:w-auto">
        {{ getAccessText(budgetStore.data.access) }}
      </span>
      <template v-if="hasData">
        <UiCurrencyPicker
          v-if="budgetStore.canEdit"
          :model-value="budgetStore.data.user.mainCurrency"
          :placeholder="t('budget.mainCurrency')"
          class="w-full sm:w-70"
          @change="$emit('currency-change', $event)"
        />
        <span
          v-else
          class="opacity-70 text-sm"
        >
          {{ t('budget.mainCurrencyLabel') }}
          {{ getCurrencyDisplayText(budgetStore.data.user.mainCurrency) }}
        </span>
      </template>
    </div>

    <div class="flex gap-2 flex-wrap animate-fade-in-right-delayed">
      <button
        v-if="hasData"
        class="btn btn-ghost btn-sm"
        data-testid="chart-button"
        @click="modalsStore.openChartModal"
      >
        <Icon
          name="heroicons:chart-bar"
          size="20"
        />
        {{ t('budget.chart') }}
      </button>

      <BudgetExportDropdown
        v-if="hasData"
        @export="$emit('export', $event)"
      />

      <button
        v-if="budgetStore.canEdit"
        class="btn btn-ghost btn-sm"
        data-testid="import-button"
        @click="$emit('import')"
      >
        <Icon
          name="heroicons:cloud-arrow-up"
          size="20"
        />
        {{ t('budget.import') }}
      </button>

      <button
        v-if="isViewingOwnBudgetUrl"
        class="btn btn-ghost btn-sm"
        data-testid="shared-budgets-button"
        @click="modalsStore.openSharedBudgetsModal"
      >
        <Icon
          name="heroicons:users"
          size="20"
        />
        {{ t('budget.sharedBudgets') }}
      </button>

      <button
        v-if="isViewingOwnBudgetUrl"
        class="btn btn-ghost btn-sm"
        data-testid="share-button"
        @click="modalsStore.openShareModal('')"
      >
        <Icon
          name="heroicons:share"
          size="20"
        />
        {{ t('budget.share') }}
      </button>

      <button
        v-if="!isViewingOwnBudgetUrl"
        class="btn btn-outline btn-sm"
        @click="$emit('navigate-to-own')"
      >
        {{ t('budget.toOwnBudget') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBudgetStore } from '~/stores/budget/budget'
import { useModalsStore } from '~/stores/budget/modals'

defineProps<{
  hasData: boolean
  isViewingOwnBudgetUrl: boolean
}>()

defineEmits<{
  'currency-change': [currency: string]
  'export': [format: 'json' | 'excel']
  'import': []
  'navigate-to-own': []
}>()

const budgetStore = useBudgetStore()
const modalsStore = useModalsStore()
const { t } = useI18n()
const { getCurrencyName } = useCurrencies()

const getAccessText = (access: string): string => {
  switch (access) {
    case 'owner':
      return t('budget.access.owner')
    case 'read':
      return t('budget.access.read')
    case 'write':
      return t('budget.access.write')
    default:
      return t('budget.access.unknown')
  }
}

const getCurrencyDisplayText = (currencyCode: string): string => {
  const currencyName = getCurrencyName(currencyCode)
  return `${currencyCode} - ${currencyName}`
}
</script>
