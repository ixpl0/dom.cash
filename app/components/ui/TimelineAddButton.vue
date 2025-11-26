<template>
  <li>
    <hr>
    <div class="timeline-start">
      <button
        class="btn btn-dash btn-sm"
        :disabled="isLoading"
        :data-testid="`add-month-${direction}`"
        @click="$emit('create')"
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

withDefaults(defineProps<Props>(), {
  isLoading: false,
})

defineEmits<{
  create: []
}>()
</script>
