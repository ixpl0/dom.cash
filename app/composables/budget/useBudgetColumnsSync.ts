const SYNC_DEBOUNCE_MS = 50

const findColumnContent = (element: HTMLElement): HTMLElement | null =>
  element.querySelector<HTMLElement>('.column-content')

const readNaturalWidth = (element: HTMLElement | undefined): number => {
  if (!element || element.offsetWidth === 0 || element.offsetHeight === 0) {
    return 0
  }

  return findColumnContent(element)?.offsetWidth ?? 0
}

const measureColumnWidths = (rows: HTMLElement[][]): number[] => {
  const columnCount = rows.reduce((longest, row) => Math.max(longest, row.length), 0)

  return Array.from({ length: columnCount }, (_, columnIndex) =>
    rows.reduce((widest, row) => Math.max(widest, readNaturalWidth(row[columnIndex])), 0))
}

export const useBudgetColumnsSync = () => {
  const isClient = import.meta.client
  const observer = ref<ResizeObserver | null>(null)
  const mounted = ref(false)
  const registeredRows = ref<HTMLElement[][]>([])
  const isUnmounting = ref(false)
  let syncTimerId: ReturnType<typeof setTimeout> | null = null
  let isRunningSync = false

  const getObservedElement = (element: HTMLElement): HTMLElement => findColumnContent(element) ?? element

  const observeRow = (elements: HTMLElement[]): void => {
    elements.forEach((element) => {
      if (element) {
        observer.value?.observe(getObservedElement(element))
      }
    })
  }

  const unobserveRow = (elements: HTMLElement[]): void => {
    elements.forEach((element) => {
      if (element) {
        observer.value?.unobserve(getObservedElement(element))
      }
    })
  }

  const registerRow = (elements: HTMLElement[]) => {
    registeredRows.value = [...registeredRows.value, elements]

    if (mounted.value && !isUnmounting.value) {
      observeRow(elements)
      syncColumnWidths()
    }
  }

  const unregisterRow = (elements: HTMLElement[]) => {
    const index = registeredRows.value.findIndex(row =>
      row.length === elements.length
      && row.every((el, i) => el === elements[i]),
    )
    if (index !== -1) {
      registeredRows.value = registeredRows.value.filter((_, rowIndex) => rowIndex !== index)
      if (mounted.value && !isUnmounting.value) {
        unobserveRow(elements)
        syncColumnWidths()
      }
    }
  }

  const runSync = () => {
    if (!isClient || !mounted.value || isUnmounting.value || !registeredRows.value.length || isRunningSync) {
      return
    }

    isRunningSync = true

    nextTick(() => {
      const columnWidths = measureColumnWidths(registeredRows.value)

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
    if (!isClient || isUnmounting.value) {
      return
    }

    observer.value = new ResizeObserver(() => {
      if (!isUnmounting.value) {
        syncColumnWidths()
      }
    })

    registeredRows.value.forEach(observeRow)

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
