<template>
  <Transition name="modal-transition">
    <div
      v-if="isOpen"
      class="modal modal-open modal-bottom sm:modal-middle"
      :style="{ zIndex }"
      v-bind="$attrs"
    >
      <div
        class="modal-backdrop"
        @click="handleBackdropClick"
      />

      <div
        ref="contentRef"
        :class="[fullscreenOnMobile ? 'max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none' : '', contentClass]"
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
  fullscreenOnMobile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  closeOnBackdrop: true,
  closeOnEsc: true,
  contentClass: '',
  zIndex: 999,
  fullscreenOnMobile: true,
})

const emit = defineEmits<{
  close: []
}>()

const handleBackdropClick = (): void => {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}

useBackHandler(() => props.isOpen, (source) => {
  if (source === 'escape' && !props.closeOnEsc) {
    return
  }

  emit('close')
})

useBodyScrollLock(() => props.isOpen)
</script>
