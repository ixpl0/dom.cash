<template>
  <div
    v-if="isVisible"
    class="alert alert-error alert-soft flex"
  >
    <div class="flex items-center justify-between max-w-7xl mx-auto gap-4">
      <div class="flex items-center gap-3">
        <svg
          class="w-5 h-5 flex-shrink-0"
          viewBox="0 0 20 20"
        >
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="font-medium">
          Данные на странице устарели и могут быть неактуальными
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="btn btn-sm btn-outline"
          @click="refreshPage"
        >
          Обновить страницу
        </button>

        <button
          class="btn btn-sm btn-circle btn-ghost"
          @click="hide"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const isVisible = ref(false)

const show = () => {
  isVisible.value = true
}

const hide = () => {
  isVisible.value = false
}

const refreshPage = () => {
  window.location.reload()
}

defineExpose({
  show,
  hide,
})
</script>
