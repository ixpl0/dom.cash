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
        class="relative"
        :class="[fullscreenOnMobile ? 'max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none' : '', contentClass]"
        @click.stop
      >
        <button
          v-if="closeButtonTestId"
          type="button"
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          :aria-label="t('common.close')"
          :data-testid="closeButtonTestId"
          @click="emit('close')"
        >
          <Icon
            name="heroicons:x-mark"
            size="20"
          />
        </button>

        <h3
          v-if="title || $slots.title"
          class="font-bold text-lg mb-4 flex-shrink-0"
          :class="{ 'pr-8': closeButtonTestId }"
        >
          <slot name="title">
            {{ title }}
          </slot>
        </h3>

        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  title?: string
  closeButtonTestId?: string
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  contentClass?: string
  zIndex?: number
  fullscreenOnMobile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  closeButtonTestId: '',
  closeOnBackdrop: true,
  closeOnEsc: true,
  contentClass: '',
  zIndex: 999,
  fullscreenOnMobile: true,
})

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

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
