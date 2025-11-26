<template>
  <UiTimelineAddButton
    :direction="direction"
    :month-text="monthText"
    :is-loading="isLoading"
    @create="$emit('create')"
  />
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
