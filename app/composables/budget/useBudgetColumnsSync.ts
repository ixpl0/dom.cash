const SYNC_DEBOUNCE_MS = 50

export const useBudgetColumnsSync = () => {
  const isClient = import.meta.client
  const observer = ref<ResizeObserver | null>(null)
  const mounted = ref(false)
  const registeredRows = ref<HTMLElement[][]>([])
  const isUnmounting = ref(false)
  let syncTimerId: ReturnType<typeof setTimeout> | null = null
  let isRunningSync = false

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

  const runSync = () => {
    if (!isClient || !mounted.value || isUnmounting.value || !registeredRows.value.length || isRunningSync) {
      return
    }

    isRunningSync = true

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
            if (!element) {
              return
            }
            const targetWidth = columnWidths[columnIndex]
            if (targetWidth) {
              element.style.width = `${targetWidth}px`
              element.style.transition = 'width 0.1s ease-out'
            }
            else {
              element.style.width = ''
              element.style.transition = ''
            }
          })
        })

        isRunningSync = false
      })
    })
  }

  const syncColumnWidths = () => {
    if (syncTimerId !== null) {
      clearTimeout(syncTimerId)
    }
    syncTimerId = setTimeout(() => {
      syncTimerId = null
      runSync()
    }, SYNC_DEBOUNCE_MS)
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
    if (isClient) {
      window.addEventListener('resize', syncColumnWidths)
    }
    startObserving()
  })

  onBeforeUnmount(() => {
    isUnmounting.value = true
    mounted.value = false
    if (syncTimerId !== null) {
      clearTimeout(syncTimerId)
      syncTimerId = null
    }
    isRunningSync = false
    stopObserving()
    registeredRows.value = []
  })

  return {
    registerRow,
    unregisterRow,
    syncColumnWidths,
  }
}
