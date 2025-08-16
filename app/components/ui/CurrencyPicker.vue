<template>
  <div
    class="form-control"
    :class="$attrs.class || 'w-48'"
  >
    <div class="dropdown w-full">
      <div
        tabindex="0"
        role="button"
      >
        <input
          ref="inputRef"
          :value="displayValue"
          type="text"
          class="input input-bordered pr-10 w-full"
          :class="{ 'truncate': !isFocused, 'cursor-pointer': !isFocused }"
          :placeholder="placeholder"
          :disabled="disabled"
          :title="titleText"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onKeyDown"
        >

        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            class="h-4 w-4 text-gray-400"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path
              d="M8 10.586L4.707 7.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L8 10.586z"
            />
          </svg>
        </div>
      </div>

      <ul
        v-if="isDropdownOpen && filteredOptions.length > 0"
        class="dropdown-content menu bg-base-100 rounded-box z-[1] w-full max-h-60 overflow-y-auto shadow-lg border border-base-300 flex-nowrap"
      >
        <li
          v-for="(option, index) in filteredOptions"
          :key="option.code"
          :class="{
            'bg-primary text-primary-content': index === highlightedIndex,
            'bg-success/20': option.code === props.modelValue && index !== highlightedIndex,
          }"
        >
          <a
            class="flex justify-between items-start gap-2 py-1"
            :class="{
              'font-bold': option.code === props.modelValue,
            }"
            @mousedown.prevent="selectOption(option)"
            @mouseenter="highlightedIndex = index"
          >
            <span class="font-medium shrink-0">
              {{ option.code }}
              <span v-if="option.code === props.modelValue" class="ml-1">✓</span>
            </span>
            <span class="text-sm opacity-70 text-right ml-2">{{ option.name }}</span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { filterCurrencies, getCurrencyName, type CurrencyOption } from '~~/shared/utils/currencies'

interface Props {
  modelValue: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue' | 'change', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

defineOptions({
  inheritAttrs: false,
})

const inputRef = ref<HTMLInputElement>()
const searchQuery = ref('')
const isDropdownOpen = ref(false)
const highlightedIndex = ref(-1)
const filteredOptions = ref<CurrencyOption[]>([])
const isFocused = ref(false)

const displayValue = computed(() => {
  if (isFocused.value) {
    return searchQuery.value
  }

  if (props.modelValue) {
    const currencyName = getCurrencyName(props.modelValue)
    return `${props.modelValue} - ${currencyName}`
  }

  return ''
})

const placeholder = computed(() => isFocused.value || !props.modelValue
  ? 'Выберите валюту...'
  : '')

const titleText = computed(() => {
  if (!props.modelValue || isFocused.value) {
    return undefined
  }
  const currencyName = getCurrencyName(props.modelValue)
  return `${props.modelValue} - ${currencyName}`
})

const updateFilteredOptions = () => {
  filteredOptions.value = filterCurrencies(searchQuery.value)
  highlightedIndex.value = filteredOptions.value.length > 0 ? 0 : -1
}

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value
  updateFilteredOptions()
  if (!isDropdownOpen.value) {
    isDropdownOpen.value = true
  }
}

const onFocus = () => {
  isFocused.value = true
  searchQuery.value = ''
  updateFilteredOptions()
  isDropdownOpen.value = true
}

const onBlur = () => {
  setTimeout(() => {
    isFocused.value = false
    isDropdownOpen.value = false
  }, 150)
}

const selectOption = (option: CurrencyOption) => {
  emit('update:modelValue', option.code)
  emit('change', option.code)
  isDropdownOpen.value = false
  isFocused.value = false
  searchQuery.value = ''
  inputRef.value?.blur()
}

const onKeyDown = (event: KeyboardEvent) => {
  if (!isDropdownOpen.value) {
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredOptions.value.length - 1,
      )
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        const option = filteredOptions.value[highlightedIndex.value]
        if (option) {
          selectOption(option)
        }
      }
      break
    case 'Escape':
      event.preventDefault()
      isDropdownOpen.value = false
      isFocused.value = false
      searchQuery.value = ''
      inputRef.value?.blur()
      break
  }
}

onMounted(() => {
  updateFilteredOptions()
})
</script>
