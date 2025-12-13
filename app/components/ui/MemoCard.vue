<template>
  <div
    class="card bg-base-100 shadow-sm border border-base-300"
    data-testid="memo-card"
  >
    <div class="card-body p-4">
      <div class="flex items-start gap-3">
        <div
          v-if="type === 'todo'"
          class="pt-1"
        >
          <input
            type="checkbox"
            class="checkbox checkbox-primary"
            :checked="isCompleted"
            data-testid="memo-card-checkbox"
            @change="$emit('toggle')"
          >
        </div>

        <div
          v-else
          class="pt-1"
        >
          <Icon
            :name="typeIcon"
            size="20"
            class="text-base-content/60"
          />
        </div>

        <div class="flex-1 min-w-0">
          <p
            class="whitespace-pre-wrap break-words"
            :class="{ 'line-through text-base-content/50': type === 'todo' && isCompleted }"
            data-testid="memo-card-content"
          >
            {{ content }}
          </p>

          <div class="flex flex-wrap items-center gap-2 mt-2 text-sm text-base-content/60">
            <span
              v-if="type === 'plan' && plannedDate"
              class="flex items-center gap-1"
              data-testid="memo-card-date"
            >
              <Icon
                name="heroicons:calendar"
                size="14"
              />
              {{ formattedDate }}
            </span>

            <span
              v-if="!isOwner"
              class="flex items-center gap-1"
            >
              <Icon
                name="heroicons:user"
                size="14"
              />
              {{ ownerUsername }}
            </span>

            <span
              v-for="user in sharedWith"
              :key="user.id"
              class="badge badge-outline badge-sm"
              data-testid="memo-card-shared-badge"
            >
              {{ user.username }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button
            class="btn btn-ghost btn-sm btn-square"
            data-testid="memo-card-edit-button"
            @click="$emit('edit')"
          >
            <Icon
              name="heroicons:pencil"
              size="16"
            />
          </button>
          <button
            class="btn btn-ghost btn-sm btn-square text-error"
            data-testid="memo-card-delete-button"
            @click="$emit('delete')"
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
import type { MemoType } from '~~/shared/types/memo'

interface Props {
  type: MemoType
  content: string
  isCompleted: boolean
  plannedDate: string | null
  isOwner: boolean
  ownerUsername: string
  sharedWith: Array<{ id: string, username: string }>
}

const props = defineProps<Props>()

defineEmits<{
  toggle: []
  edit: []
  delete: []
}>()

const typeIcon = computed(() => {
  switch (props.type) {
    case 'todo':
      return 'heroicons:check-circle'
    case 'memo':
      return 'heroicons:document-text'
    case 'plan':
      return 'heroicons:calendar-days'
    default:
      return 'heroicons:document'
  }
})

const formattedDate = computed(() => {
  if (!props.plannedDate) {
    return ''
  }
  return new Date(props.plannedDate).toLocaleDateString()
})
</script>
