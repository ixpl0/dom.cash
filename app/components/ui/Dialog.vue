<template>
  <Transition name="modal-transition">
    <div
      v-if="isOpen"
      class="modal modal-open"
      :style="{ zIndex }"
      v-bind="$attrs"
    >
      <div
        class="modal-backdrop"
        @click="handleBackdropClick"
      />

      <div
        ref="contentRef"
        :class="contentClass"
        @click.stop
      >
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  contentClass?: string
  zIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  closeOnBackdrop: true,
  closeOnEsc: true,
  contentClass: '',
  zIndex: 999,
})

const emit = defineEmits<{
  close: []
}>()

const handleBackdropClick = (): void => {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (!props.isOpen) {
    return
  }

  if (event.key === 'Escape' && props.closeOnEsc) {
    event.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(() => props.isOpen, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
  }
  else {
    document.body.style.overflow = ''
  }
})
</script>
