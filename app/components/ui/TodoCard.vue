<template>
  <div
    class="group rounded-box bg-base-200/50 hover:bg-base-200 border-2 transition-all duration-200"
    :class="isOverdue ? 'border-error' : 'border-transparent'"
    data-testid="todo-card"
  >
    <div class="p-4">
      <div class="flex items-start gap-3">
        <button
          class="todo-check flex-shrink-0 mt-0.5"
          :class="{ 'is-completed': isCompleted, 'is-overdue': isOverdue && !isCompleted }"
          data-testid="todo-card-checkbox"
          @click="$emit('toggle')"
        >
          <Icon
            v-if="isCompleted"
            name="heroicons:check"
            class="todo-check-icon"
            size="14"
          />
        </button>

        <div class="flex-1 min-w-0">
          <p
            class="whitespace-pre-wrap break-words leading-relaxed transition-all duration-200"
            :class="isCompleted ? 'line-through text-base-content/40' : 'text-base-content'"
            data-testid="todo-card-content"
          >
            {{ content }}
          </p>

          <div
            v-if="plannedDate || recurrence"
            class="flex flex-wrap items-center gap-2 mt-2 text-sm"
            data-testid="todo-card-date"
          >
            <span
              v-if="plannedDate"
              class="inline-flex items-center gap-1 transition-colors duration-200"
              :class="isOverdue ? 'text-error' : 'text-base-content/50'"
            >
              <Icon
                :name="isOverdue ? 'heroicons:bell-alert' : 'heroicons:calendar'"
                size="14"
                :class="isOverdue ? 'animate-blink' : ''"
              />
              {{ formattedDate }}
            </span>
            <span
              v-if="recurrence"
              class="inline-flex items-center gap-1 text-secondary"
              data-testid="todo-card-recurrence-badge"
            >
              <Icon
                name="heroicons:arrow-path"
                size="12"
              />
              {{ recurrenceText }}
            </span>
          </div>

          <div
            v-if="!isOwner || sharedWith.length > 0"
            class="flex flex-wrap items-center gap-2 mt-2 text-sm"
          >
            <span
              v-if="!isOwner"
              class="tooltip inline-flex items-center gap-1 text-info"
              :data-tip="authorTooltip"
            >
              <Icon
                name="heroicons:at-symbol"
                size="12"
              />
              {{ ownerUsername }}
            </span>

            <span
              v-for="user in sharedWith"
              :key="user.id"
              class="tooltip inline-flex items-center gap-1 text-success"
              :data-tip="sharedWithTooltip"
              data-testid="todo-card-shared-badge"
            >
              <Icon
                name="heroicons:user"
                size="12"
              />
              {{ user.username }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            class="btn btn-ghost btn-sm btn-square text-base-content/60 hover:text-base-content transition-colors duration-200"
            data-testid="todo-card-edit-button"
            @click="$emit('edit')"
          >
            <Icon
              name="heroicons:pencil"
              size="16"
            />
          </button>
          <button
            class="btn btn-ghost btn-sm btn-square text-base-content/60 hover:text-error transition-colors duration-200"
            data-testid="todo-card-delete-button"
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
import type { RecurrencePattern } from '~~/shared/types/recurrence'

interface Props {
  content: string
  isCompleted: boolean
  isOverdue: boolean
  plannedDate: string | null
  recurrence: RecurrencePattern | null
  isOwner: boolean
  ownerUsername: string
  sharedWith: Array<{ id: string, username: string }>
  authorTooltip: string
  sharedWithTooltip: string
  recurrenceText: string
}

const props = defineProps<Props>()

defineEmits<{
  toggle: []
  edit: []
  delete: []
}>()

const formattedDate = computed(() => {
  if (!props.plannedDate) {
    return ''
  }
  const date = new Date(props.plannedDate)
  const currentYear = new Date().getFullYear()
  const dateYear = date.getFullYear()

  if (dateYear !== currentYear) {
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
})
</script>

<style scoped>
.todo-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--color-base-content);
  opacity: 0.3;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  flex-shrink: 0;
}

.todo-check:hover {
  opacity: 0.6;
  border-color: var(--color-primary);
}

.todo-check.is-completed {
  opacity: 1;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.todo-check.is-overdue {
  border-color: var(--color-error);
  opacity: 0.8;
}

.todo-check.is-overdue:hover {
  opacity: 1;
  background: var(--color-error);
  border-color: var(--color-error);
}

.todo-check-icon {
  color: var(--color-primary-content);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.animate-blink {
  animation: blink 1s step-end infinite;
}
</style>
