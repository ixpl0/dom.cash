<template>
  <label
    class="flex items-center gap-2"
    data-testid="theme-picker-label"
  >
    <Icon
      name="heroicons:paint-brush"
      size="20"
    />
    Тема
    <select
      id="theme-select"
      v-model="model"
      class="select select-bordered select-sm w-44"
      aria-label="Выбрать тему"
      data-testid="theme-select"
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
  return t === 'auto' ? 'Auto' : t.replace(/\b\w/g, c => c.toUpperCase())
}
</script>
