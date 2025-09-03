<template>
  <div
    class="form-control"
    :class="$attrs.class || 'w-48'"
  >
    <div
      class="dropdown w-full"
      @focusout="onDropdownFocusOut"
    >
      <div
        tabindex="0"
        role="button"
        class="currency-picker-trigger"
      >
        <input
          ref="inputRef"
          :value="displayValue"
          type="text"
          class="input input-bordered pr-10 w-full"
          :class="{ 'truncate': !isFocused, 'cursor-pointer': !isFocused, 'cursor-text': isFocused }"
          :placeholder="placeholder"
          :disabled="disabled"
          :title="titleText"
          @input="onInput"
          @focus="onFocus"
          @keydown="onKeyDown"
          @click="onInputClick"
        >

        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Icon
            name="heroicons:chevron-down-solid"
            size="16"
            class="text-gray-400"
          />
        </div>
      </div>

      <ul
        v-if="isDropdownOpen && filteredOptions.length > 0"
        ref="dropdownRef"
        popover="manual"
        class="menu bg-base-100 rounded-box max-h-60 overflow-y-auto shadow-lg border border-base-300 flex-nowrap m-0 p-2"
        :style="dropdownStyle"
      >
        <li
          v-for="(option, index) in filteredOptions"
          :key="option.code"
          :class="option.code === props.modelValue && index !== highlightedIndex && 'bg-base-content/10'"
        >
          <a
            class="flex justify-between items-start gap-2 py-1"
            :class="{
              'font-bold': option.code === props.modelValue,
            }"
            tabindex="0"
            @click="selectOption(option)"
            @keydown="(event) => onOptionKeydown(event, option)"
            @mouseenter="highlightedIndex = index"
          >
            <span class="font-medium shrink-0">
              {{ option.code }}
              <span
                v-if="option.code === props.modelValue"
                class="ml-1"
              >✓</span>
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
import { useRecentCurrencies } from '~~/app/composables/useRecentCurrencies'

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
const dropdownRef = ref<HTMLElement>()
const searchQuery = ref('')
const isDropdownOpen = ref(false)
const highlightedIndex = ref(-1)
const filteredOptions = ref<CurrencyOption[]>([])
const isFocused = ref(false)
const dropdownStyle = ref<Record<string, string>>({})

const { addRecentCurrency, getRecentCurrencies } = useRecentCurrencies()
const recentCurrencies = getRecentCurrencies()

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
  filteredOptions.value = filterCurrencies(searchQuery.value, [...recentCurrencies.value])
  highlightedIndex.value = filteredOptions.value.length > 0 ? 0 : -1
}

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value
  updateFilteredOptions()
  if (!isDropdownOpen.value) {
    updateDropdownPosition()
    isDropdownOpen.value = true
  }
}

const onInputClick = () => {
  if (!isFocused.value) {
    inputRef.value?.focus()
  }
}

const updateDropdownPosition = () => {
  if (!inputRef.value || !dropdownRef.value) {
    return
  }

  const rect = inputRef.value.getBoundingClientRect()
  const dropdownMaxHeight = 240
  const windowHeight = window.innerHeight
  const spaceBelow = windowHeight - rect.bottom
  const spaceAbove = rect.top
  const showAbove = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow

  if (showAbove) {
    dropdownStyle.value = {
      position: 'fixed',
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      bottom: `${windowHeight - rect.top}px`,
      top: 'auto',
    }
  }
  else {
    dropdownStyle.value = {
      position: 'fixed',
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      top: `${rect.bottom}px`,
      bottom: 'auto',
    }
  }
}

const showDropdown = () => {
  if (!dropdownRef.value) {
    return
  }

  try {
    dropdownRef.value.showPopover()
  }
  catch {
    console.warn('Popover API not supported, falling back to regular display')
  }
  finally {
    updateDropdownPosition()
  }
}

const hideDropdown = () => {
  if (!dropdownRef.value) {
    return
  }

  try {
    dropdownRef.value.hidePopover()
  }
  catch {
    console.warn('Popover API not supported')
  }
}

const onFocus = () => {
  isFocused.value = true
  if (!isDropdownOpen.value) {
    searchQuery.value = ''
    updateFilteredOptions()
    isDropdownOpen.value = true
    nextTick(() => showDropdown())
  }
}

const onDropdownFocusOut = (event: FocusEvent) => {
  const dropdown = event.currentTarget as HTMLElement
  const relatedTarget = event.relatedTarget as HTMLElement | null

  if (relatedTarget && !dropdown.contains(relatedTarget) && !dropdownRef.value?.contains(relatedTarget)) {
    isFocused.value = false
    isDropdownOpen.value = false
    hideDropdown()
  }
}

const selectOption = (option: CurrencyOption) => {
  addRecentCurrency(option.code)
  emit('update:modelValue', option.code)
  emit('change', option.code)
  isDropdownOpen.value = false
  hideDropdown()
  isFocused.value = false
  searchQuery.value = ''
  inputRef.value?.blur()
}

const onOptionKeydown = (event: KeyboardEvent, option: CurrencyOption) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectOption(option)
  }
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
      hideDropdown()
      isFocused.value = false
      searchQuery.value = ''
      inputRef.value?.blur()
      break
  }
}

watch(isDropdownOpen, (open) => {
  if (open) {
    nextTick(() => showDropdown())
  }
  else {
    hideDropdown()
  }
})

onMounted(() => {
  updateFilteredOptions()

  const handleScroll = () => {
    if (isDropdownOpen.value) {
      updateDropdownPosition()
    }
  }

  const handleResize = () => {
    if (isDropdownOpen.value) {
      updateDropdownPosition()
    }
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (isDropdownOpen.value
      && !inputRef.value?.contains(event.target as Node)
      && !dropdownRef.value?.contains(event.target as Node)) {
      isDropdownOpen.value = false
      hideDropdown()
      isFocused.value = false
    }
  }

  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', handleClickOutside)

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll, true)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<style scoped>
.dropdown.dropdown-open .currency-picker-trigger,
.dropdown:focus-within .currency-picker-trigger {
  pointer-events: auto !important;
}

.dropdown.dropdown-open .currency-picker-trigger input,
.dropdown:focus-within .currency-picker-trigger input {
  pointer-events: auto !important;
}
</style>
