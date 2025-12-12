<template>
  <div class="overflow-x-auto">
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
            <span
              :class="{
                'text-success': entryKind === 'income' && entry.amount > 0,
                'text-error': entryKind === 'expense' && entry.amount > 0,
                'text-primary': entryKind === 'balance' && entry.amount > 0,
                'text-base-content': entry.amount === 0,
                'text-warning': entry.amount < 0,
              }"
            >{{ formatAmount(entry.amount, entry.currency) }}</span>
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

const formatEntryDate = (entry: EntryTableEntry): string => {
  return props.formatDate(entry.date)
}
</script>
