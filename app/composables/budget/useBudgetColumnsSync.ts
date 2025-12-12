export const useBudgetColumnsSync = () => {
  const isClient = import.meta.client
  const observer = ref<ResizeObserver | null>(null)
  const mounted = ref(false)
  const isProcessing = ref(false)
  const registeredRows = ref<HTMLElement[][]>([])
  const isUnmounting = ref(false)

  const registerRow = (elements: HTMLElement[]) => {
    registeredRows.value.push(elements)

    if (mounted.value) {
      startObserving()
    }
  }

  const unregisterRow = (elements: HTMLElement[]) => {
    const index = registeredRows.value.findIndex(row =>
      row.length === elements.length
      && row.every((el, i) => el === elements[i]),
    )
    if (index !== -1) {
      registeredRows.value.splice(index, 1)
      if (mounted.value) {
        startObserving()
      }
    }
  }

  const syncColumnWidths = () => {
    if (!isClient || !mounted.value || isProcessing.value || isUnmounting.value || !registeredRows.value.length) return

    isProcessing.value = true

    nextTick(() => {
      const columnWidths: Record<number, number> = {}

      registeredRows.value.forEach((row) => {
        row.forEach((element, columnIndex) => {
          if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
            return
          }

          const columnContent = element.querySelector('.column-content') as HTMLElement
          if (!columnContent) {
            return
          }

          const currentWidth = element.offsetWidth
          element.style.width = 'auto'
          element.style.transition = 'none'

          const naturalWidth = columnContent.offsetWidth

          element.style.width = `${currentWidth}px`

          columnWidths[columnIndex] = Math.max(columnWidths[columnIndex] || 0, naturalWidth)
        })
      })

      requestAnimationFrame(() => {
        registeredRows.value.forEach((row) => {
          row.forEach((element, columnIndex) => {
            if (element && columnWidths[columnIndex]) {
              element.style.width = `${columnWidths[columnIndex]}px`
              element.style.transition = 'width 0.1s ease-out'
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
    if (!isClient || isUnmounting.value) return

    if (observer.value) {
      observer.value.disconnect()
    }

    observer.value = new ResizeObserver(() => {
      if (!isUnmounting.value) {
        syncColumnWidths()
      }
    })

    registeredRows.value.flat().forEach((element) => {
      if (element) {
        const columnContent = element.querySelector('.column-content') as HTMLElement
        if (columnContent) {
          observer.value?.observe(columnContent)
        }
        else {
          observer.value?.observe(element)
        }
      }
    })

    window.addEventListener('resize', syncColumnWidths)
    syncColumnWidths()
  }

  const stopObserving = () => {
    if (observer.value) {
      observer.value.disconnect()
      observer.value = null
    }

    if (isClient) {
      window.removeEventListener('resize', syncColumnWidths)
    }
  }

  onMounted(() => {
    mounted.value = true
    startObserving()
  })

  onBeforeUnmount(() => {
    isUnmounting.value = true
    mounted.value = false
    isProcessing.value = false
    stopObserving()
    registeredRows.value = []
  })

  return {
    registerRow,
    unregisterRow,
    syncColumnWidths,
  }
}
