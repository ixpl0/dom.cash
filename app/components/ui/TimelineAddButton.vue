<template>
  <div class="flex justify-center">
    <button
      class="btn btn-dash btn-sm hover:btn-primary transition-all duration-200"
      :disabled="isLoading"
      :data-testid="`add-month-${direction}`"
      @click="$emit('create')"
    >
      <span
        v-if="isLoading"
        class="loading loading-spinner loading-xs"
      />
      <Icon
        v-else
        name="heroicons:plus"
        size="16"
      />
      {{ monthText }}
    </button>
  </div>
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
