<template>
  <label class="flex items-center gap-2">
    <span class="label-text text-xs">Тема</span>
    <select
      id="theme-select"
      v-model="model"
      class="select select-bordered select-sm w-44"
      aria-label="Выбрать тему"
    >
      <option
        v-for="t in options"
        :key="t"
        :value="t"
      >
        {{ formatTheme(t) }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { themes, currentTheme, setTheme, initTheme } = useTheme()

onMounted(() => {
  initTheme()
})

const model = computed({
  get: () => currentTheme.value,
  set: (val: string) => setTheme(val),
})

const options = computed(() => ['auto', ...themes])

const formatTheme = (t: string) => {
  if (t === 'auto') return 'Авто'
  return t.replace(/\b\w/g, c => c.toUpperCase())
}
</script>
