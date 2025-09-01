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
          <svg
            class="h-4 w-4 text-gray-400"
            viewBox="0 0 16 16"
          >
            <path
              fill="currentColor"
              d="M8 10.586L4.707 7.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L8 10.586z"
            />
          </svg>
        </div>
      </div>

      <Teleport :to="teleportTarget">
        <ul
          v-if="isDropdownOpen && filteredOptions.length > 0"
          ref="dropdownRef"
          class="menu bg-base-100 rounded-box z-[9999] max-h-60 overflow-y-auto shadow-lg border border-base-300 flex-nowrap fixed"
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
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { filterCurrencies, getCurrencyName, type CurrencyOption } from '~~/shared/utils/currencies'
import { useRecentCurrencies } from '~~/app/composables/useRecentCurrencies'

interface Props {
  modelValue: string
  disabled?: boolean
  teleportTo?: string | HTMLElement
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

const teleportTarget = computed(() => {
  if (!props.teleportTo) {
    return 'body'
  }

  if (typeof props.teleportTo === 'string') {
    return props.teleportTo
  }

  return props.teleportTo
})

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
  if (!inputRef.value) {
    return
  }

  const rect = inputRef.value.getBoundingClientRect()
  const isInModal = props.teleportTo && props.teleportTo !== 'body'
  const dropdownMaxHeight = 240 // max-h-60 = 15rem = 240px
  const windowHeight = window.innerHeight
  const spaceBelow = windowHeight - rect.bottom
  const spaceAbove = rect.top
  const showAbove = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow

  if (isInModal && typeof props.teleportTo !== 'string') {
    const modalRect = props.teleportTo.getBoundingClientRect()
    const relativeTop = rect.top - modalRect.top
    const relativeLeft = rect.left - modalRect.left

    if (showAbove) {
      dropdownStyle.value = {
        position: 'absolute',
        left: `${relativeLeft}px`,
        width: `${rect.width}px`,
        bottom: `${modalRect.height - relativeTop}px`,
        top: 'auto',
      }
    }
    else {
      dropdownStyle.value = {
        position: 'absolute',
        left: `${relativeLeft}px`,
        width: `${rect.width}px`,
        top: `${relativeTop + rect.height}px`,
        bottom: 'auto',
      }
    }
  }
  else {
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
}

const onFocus = () => {
  isFocused.value = true
  if (!isDropdownOpen.value) {
    searchQuery.value = ''
    updateFilteredOptions()
    updateDropdownPosition()
    isDropdownOpen.value = true
  }
}

const onDropdownFocusOut = (event: FocusEvent) => {
  const dropdown = event.currentTarget as HTMLElement
  const relatedTarget = event.relatedTarget as HTMLElement | null

  if (relatedTarget && !dropdown.contains(relatedTarget) && !dropdownRef.value?.contains(relatedTarget)) {
    isFocused.value = false
    isDropdownOpen.value = false
  }
}

const selectOption = (option: CurrencyOption) => {
  addRecentCurrency(option.code)
  emit('update:modelValue', option.code)
  emit('change', option.code)
  isDropdownOpen.value = false
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
      isFocused.value = false
      searchQuery.value = ''
      inputRef.value?.blur()
      break
  }
}

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
