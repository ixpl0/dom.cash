<template>
  <div class="toast toast-top toast-end z-50">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="getToastClass(toast.type)"
      class="alert shadow-lg cursor-pointer"
      @click="removeToast(toast.id)"
    >
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const TOAST_CLASSES = {
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
  info: 'alert-info',
} as const

const { toasts, removeToast } = useToast()

const getToastClass = (type?: string) => {
  return TOAST_CLASSES[type as keyof typeof TOAST_CLASSES] ?? TOAST_CLASSES.info
}
</script>
