<template>
  <dialog :open="open" class="modal">
    <form method="dialog" class="modal-box" @submit.prevent="saveEntry">
      <h3 class="font-bold text-lg">
        {{ headerTitle }} {{ formatAmount(total, baseCurrency) }}
      </h3>
      <div class="mt-4 space-y-4">
        <div
          v-for="entry in localEntries"
          :key="entry.id"
          class="flex items-center justify-between"
        >
          <div>
            <div class="font-medium">
              {{ getDescription(entry) }}
            </div>
            <div class="text-sm opacity-70">
              {{ formatAmount(entry.amount, entry.currency) }}
            </div>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn btn-sm"
              @click="edit(entry)">
              ✏️
            </button>
            <button
              type="button"
              class="btn btn-sm btn-error"
              @click="remove(entry.id)">
              🗑️
            </button>
          </div>
        </div>
        <div class="divider" />
        <input
          v-model="form.description"
          class="input input-bordered w-full"
          placeholder="Описание"
        />
        <input
          v-model.number="form.amount"
          type="number"
          class="input input-bordered w-full"
          placeholder="Сумма"
        />
        <input
          v-model="form.currency"
          class="input input-bordered w-full"
          placeholder="Валюта"
        />
        <input
          v-if="showDate"
          v-model="form.date"
          type="date"
          class="input input-bordered w-full"
        />
      </div>
      <div class="modal-action">
        <button
          type="button"
          class="btn"
          @click="close">
          Отмена
        </button>
        <button type="submit" class="btn btn-primary">
          Сохранить
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { calculateTotalBalance, formatAmount } from '~~/shared/utils/budget'
import type { BalanceSourceData, IncomeEntryData, ExpenseEntryData } from '~~/shared/types/budget'

type Entry = BalanceSourceData | IncomeEntryData | ExpenseEntryData

interface Props {
  modelValue: boolean
  kind: 'balance' | 'income' | 'expense'
  entries: Entry[]
  monthId: string
  baseCurrency: string
  rates: Record<string, number>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'change', entries: Entry[]): void
}>()

const open = useVModel(props, 'modelValue')

const localEntries = ref<Entry[]>([...props.entries])
watch(() => props.entries, v => {
  localEntries.value = [...v]
})

const showDate = computed(() => props.kind !== 'balance')

const form = ref({ id: '', description: '', amount: 0, currency: props.baseCurrency, date: '' })

const resetForm = () => {
  form.value = { id: '', description: '', amount: 0, currency: props.baseCurrency, date: '' }
}

const headerTitle = computed(() => {
  if (props.kind === 'balance') return 'Баланс'
  if (props.kind === 'income') return 'Доходы'
  return 'Расходы'
})

const getDescription = (entry: Entry) => {
  return 'name' in entry ? entry.name : entry.description
}

const total = computed(() => {
  const mapped = localEntries.value.map(e => ({
    id: e.id,
    name: getDescription(e),
    currency: e.currency,
    amount: e.amount,
  }))
  return calculateTotalBalance(mapped, props.baseCurrency, props.rates)
})

const close = () => {
  open.value = false
  resetForm()
}

const edit = (entry: Entry) => {
  form.value = {
    id: entry.id,
    description: getDescription(entry),
    amount: entry.amount,
    currency: entry.currency,
    date: 'date' in entry ? entry.date || '' : '',
  }
}

const remove = async (id: string) => {
  await $fetch(`/api/budget/entry/${id}`, { method: 'DELETE' })
  localEntries.value = localEntries.value.filter(e => e.id !== id)
  emit('change', localEntries.value)
}

const saveEntry = async () => {
  if (!form.value.description || !form.value.amount || !form.value.currency) return
  if (form.value.id) {
    const updated = await $fetch<Entry>(`/api/budget/entry/${form.value.id}`, {
      method: 'PUT',
      body: {
        description: form.value.description,
        amount: form.value.amount,
        currency: form.value.currency,
        date: form.value.date || undefined,
      },
    })
    localEntries.value = localEntries.value.map(e => e.id === updated.id ? updated : e)
  }
  else {
    const created = await $fetch<Entry>('/api/budget/entry', {
      method: 'POST',
      body: {
        monthId: props.monthId,
        kind: props.kind,
        description: form.value.description,
        amount: form.value.amount,
        currency: form.value.currency,
        date: form.value.date || undefined,
      },
    })
    localEntries.value = localEntries.value.concat(created)
  }
  emit('change', localEntries.value)
  close()
}
</script>

