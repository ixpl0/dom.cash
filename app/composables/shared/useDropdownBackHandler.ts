export const useDropdownBackHandler = () => {
  const dropdownRef = ref<HTMLElement | null>(null)
  const isOpen = ref(false)
  const route = useRoute()

  const isInsideDropdown = (target: EventTarget | null): boolean =>
    target instanceof Node && (dropdownRef.value?.contains(target) ?? false)

  const handleFocusIn = (): void => {
    isOpen.value = true
  }

  const handleFocusOut = (event: FocusEvent): void => {
    const isWindowLosingFocus = event.relatedTarget === null && !document.hasFocus()

    if (isInsideDropdown(event.relatedTarget) || isWindowLosingFocus) {
      return
    }

    isOpen.value = false
  }

  const close = (): void => {
    const { activeElement } = document

    if (activeElement instanceof HTMLElement && isInsideDropdown(activeElement)) {
      activeElement.blur()
    }

    isOpen.value = false
  }

  useBackHandler(isOpen, close)

  watch(() => route.fullPath, close)

  watch(dropdownRef, (dropdownElement) => {
    if (!dropdownElement) {
      isOpen.value = false
    }
  })

  return {
    dropdownRef,
    handleFocusIn,
    handleFocusOut,
    close,
  }
}
