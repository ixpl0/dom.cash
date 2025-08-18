export const useStatSync = () => {
  const isClient = import.meta.client
  const observer = ref<ResizeObserver | null>(null)
  const mounted = ref(false)
  const isProcessing = ref(false)
  const registeredRows = ref<HTMLElement[][]>([])

  const registerRow = (elements: HTMLElement[]) => {
    registeredRows.value.push(elements)

    if (mounted.value) {
      syncStatWidths()
    }
  }

  const unregisterRow = (elements: HTMLElement[]) => {
    const index = registeredRows.value.findIndex(row =>
      row.length === elements.length
      && row.every((el, i) => el === elements[i]),
    )
    if (index !== -1) {
      registeredRows.value.splice(index, 1)
    }
  }

  const syncStatWidths = () => {
    if (!isClient || !mounted.value || isProcessing.value || !registeredRows.value.length) return

    isProcessing.value = true

    nextTick(() => {
      const columnWidths: Record<number, number> = {}

      registeredRows.value.forEach((row) => {
        row.forEach((element, columnIndex) => {
          if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
            return
          }

          const currentWidth = element.offsetWidth
          element.style.width = `${currentWidth}px`
          element.style.transition = 'width 0.1s ease-out'

          element.style.width = 'auto'
          const width = element.offsetWidth
          columnWidths[columnIndex] = Math.max(columnWidths[columnIndex] || 0, width)

          element.style.width = `${currentWidth}px`
        })
      })

      requestAnimationFrame(() => {
        registeredRows.value.forEach((row) => {
          row.forEach((element, columnIndex) => {
            if (element && columnWidths[columnIndex]) {
              element.style.width = `${columnWidths[columnIndex]}px`
            }
          })
        })

        setTimeout(() => {
          isProcessing.value = false
        }, 150)
      })
    })
  }

  const startObserving = () => {
    if (!isClient) return

    if (observer.value) {
      observer.value.disconnect()
    }

    observer.value = new ResizeObserver(() => {
      syncStatWidths()
    })

    registeredRows.value.flat().forEach((element) => {
      if (element) {
        observer.value?.observe(element)
      }
    })

    window.addEventListener('resize', syncStatWidths)
    syncStatWidths()
  }

  const stopObserving = () => {
    if (observer.value) {
      observer.value.disconnect()
      observer.value = null
    }

    if (isClient) {
      window.removeEventListener('resize', syncStatWidths)
    }
  }

  onMounted(() => {
    mounted.value = true
    startObserving()
  })

  onUnmounted(() => {
    mounted.value = false
    stopObserving()
    registeredRows.value = []
  })

  return {
    registerRow,
    unregisterRow,
    syncStatWidths,
  }
}
