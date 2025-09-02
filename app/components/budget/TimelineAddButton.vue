<template>
  <li>
    <hr>
    <div class="timeline-start">
      <button
        class="btn btn-ghost btn-sm"
        :disabled="isLoading"
        @click="handleClick"
      >
        <Icon
          name="heroicons:plus"
          size="16"
        />
        {{ monthText }}
      </button>
    </div>
    <div class="timeline-middle">
      <div class="w-3 h-3 m-1 bg-base-300 rounded-full" />
    </div>
    <hr>
  </li>
</template>

<script setup lang="ts">
interface Props {
  direction: 'next' | 'previous'
  monthText: string
  isLoading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  create: []
}>()

const handleClick = (): void => {
  emit('create')
}
</script>
