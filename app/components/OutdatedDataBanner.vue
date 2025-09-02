<template>
  <div
    v-if="isVisible"
    class="alert alert-error alert-soft flex"
  >
    <div class="flex items-center justify-between max-w-7xl mx-auto gap-4">
      <div class="flex items-center gap-3">
        <Icon
          name="heroicons:exclamation-triangle-solid"
          size="20"
          class="flex-shrink-0"
        />
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
          <Icon
            name="heroicons:x-mark"
            size="20"
          />
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
