<template>
  <label
    class="flex items-center gap-2"
    data-testid="language-picker-label"
  >
    <Icon
      name="heroicons:language"
      size="20"
    />
    <select
      id="language-select"
      v-model="currentLocale"
      class="select select-bordered select-sm w-36"
      aria-label="Select language"
      data-testid="language-select"
    >
      <option
        v-for="loc in availableLocales"
        :key="loc.code"
        :value="loc.code"
      >
        {{ loc.name }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

const availableLocales = computed(() => {
  return locales.value.filter(loc => typeof loc !== 'string')
})

const currentLocale = computed({
  get: () => locale.value,
  set: async (val: typeof locale.value) => {
    if (val === locale.value) {
      return
    }
    await setLocale(val)
  },
})
</script>
