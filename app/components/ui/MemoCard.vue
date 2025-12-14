<template>
  <div
    class="card bg-base-100 shadow-sm border"
    :class="isOverdue ? 'border-error border-2' : 'border-base-300'"
    data-testid="memo-card"
  >
    <div class="card-body p-4">
      <div class="flex items-start gap-3">
        <div>
          <input
            type="checkbox"
            class="checkbox checkbox-primary"
            :checked="isCompleted"
            data-testid="memo-card-checkbox"
            @change="$emit('toggle')"
          >
        </div>

        <div class="flex-1 min-w-0 pt-1">
          <p
            class="whitespace-pre-wrap break-words"
            :class="{ 'line-through text-base-content/50': isCompleted }"
            data-testid="memo-card-content"
          >
            {{ content }}
          </p>

          <div
            v-if="plannedDate"
            class="flex items-center gap-1 mt-2 text-sm text-base-content/60"
            :class="isOverdue ? 'text-error font-medium' : ''"
            data-testid="memo-card-date"
          >
            <Icon
              :name="isOverdue ? 'heroicons:bell-alert' : 'heroicons:calendar'"
              size="14"
              :class="isOverdue ? 'animate-blink' : ''"
            />
            {{ formattedDateTime }}
          </div>

          <div
            v-if="!isOwner || sharedWith.length > 0"
            class="flex flex-wrap items-center gap-2 mt-2 text-sm"
          >
            <span
              v-if="!isOwner"
              class="tooltip badge badge-info badge-outline badge-sm gap-1"
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
              class="tooltip badge badge-success badge-outline badge-sm gap-1"
              :data-tip="sharedWithTooltip"
              data-testid="memo-card-shared-badge"
            >
              <Icon
                name="heroicons:user"
                size="12"
              />
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
interface Props {
  content: string
  isCompleted: boolean
  plannedDate: string | null
  isOwner: boolean
  ownerUsername: string
  sharedWith: Array<{ id: string, username: string }>
  authorTooltip: string
  sharedWithTooltip: string
}

const props = defineProps<Props>()

defineEmits<{
  toggle: []
  edit: []
  delete: []
}>()

const isOverdue = computed(() => {
  if (!props.plannedDate || props.isCompleted) {
    return false
  }
  return new Date(props.plannedDate) <= new Date()
})

const formattedDateTime = computed(() => {
  if (!props.plannedDate) {
    return ''
  }
  const date = new Date(props.plannedDate)
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>

<style scoped>
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.animate-blink {
  animation: blink 1s step-end infinite;
}
</style>
