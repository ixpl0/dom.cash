<template>
  <div
    class="w-full"
    :class="containerClass"
  >
    <h3
      v-if="title"
      class="font-bold text-lg mb-4"
    >
      {{ title }}
    </h3>
    <div
      class="w-full"
      :style="{ height: chartHeight }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  chartHeight?: string
  containerClass?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
  chartHeight: '400px',
  containerClass: '',
})
</script>
