<template>
  <div
    v-if="isMobileViewport"
    class="flex flex-col gap-2"
  >
    <UiEntryCard
      v-for="entry in entries"
      :key="entry.id"
      :description="entry.description"
      :amount-text="formatAmount(entry.amount, entry.currency)"
      :amount-class="getEntryAmountClass(entryKind, entry.amount)"
      :currency="entry.currency"
      :date-text="entryKind !== 'balance' ? formatEntryDate(entry) : ''"
      :show-optional="entryKind === 'expense'"
      :is-optional="entry.isOptional"
      :optional-label="labels.optional"
      :is-read-only="true"
    />
  </div>
  <div
    v-else
    class="overflow-x-auto"
  >
    <table class="table text-center">
      <thead>
        <tr>
          <th>{{ labels.description }}</th>
          <th>{{ labels.amount }}</th>
          <th>{{ labels.currency }}</th>
          <th v-if="entryKind !== 'balance'">
            {{ labels.date }}
          </th>
          <th v-if="entryKind === 'expense'">
            {{ labels.optional }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="entry in entries"
          :key="entry.id"
          data-testid="entry-row"
        >
          <td>
            <span>{{ entry.description }}</span>
          </td>
          <td>
            <span :class="getEntryAmountClass(entryKind, entry.amount)">{{ formatAmount(entry.amount, entry.currency) }}</span>
          </td>
          <td>
            <span>{{ entry.currency }}</span>
          </td>
          <td v-if="entryKind !== 'balance'">
            <span>{{ formatEntryDate(entry) }}</span>
          </td>
          <td v-if="entryKind === 'expense'">
            <Icon
              v-if="'isOptional' in entry && entry.isOptional"
              name="heroicons:check"
              size="20"
              class="text-success inline-block"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { formatAmount } from '~~/shared/utils/budget/budget'

export interface EntryTableEntry {
  id: string
  description: string
  amount: number
  currency: string
  date?: string | null
  isOptional?: boolean
}

export interface EntryTableLabels {
  description: string
  amount: string
  currency: string
  date: string
  optional: string
}

interface Props {
  entries: ReadonlyArray<EntryTableEntry>
  entryKind: 'balance' | 'income' | 'expense'
  labels: EntryTableLabels
  formatDate: (date: string | null | undefined) => string
}

const props = defineProps<Props>()

const { isMobileViewport } = useIsMobileViewport()

const formatEntryDate = (entry: EntryTableEntry): string => {
  return props.formatDate(entry.date)
}
</script>
