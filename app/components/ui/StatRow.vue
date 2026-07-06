<template>
  <component
    :is="isInteractive ? 'button' : 'div'"
    :type="isInteractive ? 'button' : undefined"
    class="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left"
    :class="isInteractive ? 'cursor-pointer transition-colors hover:bg-base-300 active:bg-base-300' : ''"
    :data-testid="testId"
    @click="handleClick"
  >
    <span class="text-sm text-base-content/70 flex-shrink-0">{{ label }}</span>
    <span class="min-w-0 text-right">
      <span
        class="block font-semibold truncate"
        :class="valueClass"
      >{{ valueText }}</span>
      <span
        v-if="secondaryText"
        class="block text-xs truncate"
        :class="secondaryClass"
      >{{ secondaryText }}</span>
    </span>
  </component>
</template>

<script setup lang="ts">
interface Props {
  label: string
  valueText: string
  valueClass?: string
  secondaryText?: string
  secondaryClass?: string
  clickable?: boolean
  disabled?: boolean
  testId?: string
}

const props = withDefaults(defineProps<Props>(), {
  valueClass: '',
  secondaryText: '',
  secondaryClass: '',
  clickable: false,
  disabled: false,
  testId: undefined,
})

const emit = defineEmits<{
  activate: []
}>()

const isInteractive = computed(() => props.clickable && !props.disabled)

const handleClick = (): void => {
  if (isInteractive.value) {
    emit('activate')
  }
}
</script>
