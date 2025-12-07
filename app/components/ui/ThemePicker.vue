<template>
  <label
    class="flex items-center gap-2"
    data-testid="theme-picker-label"
  >
    <Icon
      name="heroicons:paint-brush"
      size="20"
    />
    <select
      id="theme-select"
      v-model="model"
      class="select select-bordered select-sm w-32"
      :aria-label="t('theme.label')"
      data-testid="theme-select"
    >
      <option
        v-for="theme in options"
        :key="theme"
        :value="theme"
      >
        {{ formatTheme(theme) }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { t } = useI18n()
const { themes, currentTheme, setTheme } = useTheme()

const model = computed({
  get: () => currentTheme.value,
  set: (val: string) => setTheme(val),
})

const options = computed(() => ['auto', ...themes])

const themeDisplayNames: Record<string, string> = {
  auto: 'Auto',
  crystalclear: 'Crystal Clear',
  grayscale: 'Grayscale',
  grayscaledark: 'Grayscale Dark',
  kekdark: 'Kek Dark',
  kekdarker: 'Kek Darker',
  keklight: 'Kek Light',
  keklighter: 'Kek Lighter',
  summerhaze: 'Summer Haze',
  ritualhabitual: 'Ritual Habitual',
}

const formatTheme = (t: string) => {
  return themeDisplayNames[t] || t.replace(/\b\w/g, c => c.toUpperCase())
}
</script>
