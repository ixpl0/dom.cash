<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box w-[calc(100vw-2rem)] max-w-md flex flex-col"
    data-testid="plan-modal"
    @close="hide"
  >
    <button
      type="button"
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
      data-testid="plan-modal-close"
      @click="hide"
    >
      <Icon
        name="heroicons:x-mark"
        size="20"
      />
    </button>

    <h3 class="font-bold text-lg mb-4 flex-shrink-0">
      {{ t('budget.plan.title') }}
      <span class="opacity-70 font-normal text-base">
        — {{ planModal.monthTitle }}
      </span>
    </h3>

    <p class="text-sm opacity-70 mb-4">
      {{ t('budget.plan.description', { currency: budgetStore.effectiveMainCurrency }) }}
    </p>

    <form
      class="space-y-4"
      @submit.prevent="save"
    >
      <div>
        <label
          class="label"
          for="plan-amount-input"
        >
          <span class="label-text">{{ t('budget.plan.amountLabel') }}</span>
        </label>
        <input
          id="plan-amount-input"
          ref="amountInputRef"
          v-model.number="amountInput"
          type="number"
          step="any"
          class="input input-bordered w-full"
          :placeholder="t('budget.plan.amountPlaceholder')"
          data-testid="plan-amount-input"
        >
      </div>

      <div>
        <label
          class="label"
          for="plan-comment-input"
        >
          <span class="label-text">{{ t('budget.plan.commentLabel') }}</span>
        </label>
        <input
          id="plan-comment-input"
          ref="commentInputRef"
          v-model="commentInput"
          type="text"
          class="input input-bordered w-full"
          maxlength="2000"
          :placeholder="t('budget.plan.commentPlaceholder')"
          data-testid="plan-comment-input"
        >
      </div>

      <div class="flex justify-between gap-2 pt-2">
        <button
          v-if="planModal.currentValue !== null || planModal.currentComment !== null"
          type="button"
          class="btn btn-ghost btn-error"
          :disabled="isSaving"
          data-testid="plan-clear-button"
          @click="clearPlan"
        >
          <Icon
            name="heroicons:trash"
            size="16"
          />
          {{ t('budget.plan.clear') }}
        </button>
        <div
          v-else
          class="flex-1"
        />

        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="isSaving"
            data-testid="plan-cancel-button"
            @click="hide"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="isSaving || !isValid"
            data-testid="plan-save-button"
          >
            <span
              v-if="isSaving"
              class="loading loading-spinner loading-xs"
            />
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </form>
  </UiDialog>
</template>

<script setup lang="ts">
import { useBudgetStore } from '~/stores/budget/budget'
import { useModalsStore } from '~/stores/budget/modals'

const modalsStore = useModalsStore()
const budgetStore = useBudgetStore()
const { t } = useI18n()
const { toast } = useToast()
const { formatError } = useServerError()

const planModal = computed(() => modalsStore.planModal)
const isOpen = computed(() => planModal.value.isOpen)

const amountInput = ref<number | string>('')
const commentInput = ref<string>('')
const amountInputRef = ref<HTMLInputElement | null>(null)
const commentInputRef = ref<HTMLInputElement | null>(null)
const isSaving = ref(false)

const isAmountFilled = computed(() => {
  if (typeof amountInput.value === 'number') {
    return Number.isFinite(amountInput.value)
  }
  if (typeof amountInput.value === 'string' && amountInput.value.trim() !== '') {
    const parsed = Number(amountInput.value)
    return Number.isFinite(parsed)
  }
  return false
})

const isValid = computed(() => {
  return isAmountFilled.value || commentInput.value.trim() !== ''
})

const hide = (): void => {
  modalsStore.closePlanModal()
}

const save = async (): Promise<void> => {
  const currentYear = planModal.value.year
  const currentMonth = planModal.value.month
  if (currentYear === null || currentMonth === null || !isValid.value) {
    return
  }

  const plannedBalanceChange = isAmountFilled.value
    ? Math.round(typeof amountInput.value === 'number' ? amountInput.value : Number(amountInput.value))
    : null

  const trimmedComment = commentInput.value.trim()
  const commentToSave = trimmedComment.length === 0 ? null : trimmedComment

  isSaving.value = true
  try {
    await budgetStore.upsertPlan(currentYear, currentMonth, plannedBalanceChange, commentToSave)
    toast({ type: 'success', message: t('budget.plan.savedToast') })
    hide()
  }
  catch (err) {
    toast({ type: 'error', message: formatError(err, t('budget.plan.saveError')) })
  }
  finally {
    isSaving.value = false
  }
}

const clearPlan = async (): Promise<void> => {
  const currentYear = planModal.value.year
  const currentMonth = planModal.value.month
  if (currentYear === null || currentMonth === null) {
    return
  }

  isSaving.value = true
  try {
    await budgetStore.removePlan(currentYear, currentMonth)
    toast({ type: 'success', message: t('budget.plan.clearedToast') })
    hide()
  }
  catch (err) {
    toast({ type: 'error', message: formatError(err, t('budget.plan.saveError')) })
  }
  finally {
    isSaving.value = false
  }
}

watch(isOpen, async (open) => {
  if (open) {
    amountInput.value = planModal.value.currentValue ?? ''
    commentInput.value = planModal.value.currentComment ?? ''
    await nextTick()
    if (planModal.value.focusField === 'comment') {
      commentInputRef.value?.focus()
      commentInputRef.value?.select()
    }
    else {
      amountInputRef.value?.focus()
      amountInputRef.value?.select()
    }
  }
})
</script>
