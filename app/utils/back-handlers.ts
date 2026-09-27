export type BackSource = 'history' | 'escape'

export type BackHandler = (source: BackSource) => void

export interface BackHandlerRoute {
  fullPath: string
  redirectedFrom?: unknown
}

export interface BackHandlerRouter {
  beforeEach: (guard: (to: BackHandlerRoute, from: BackHandlerRoute) => Promise<boolean>) => unknown
  afterEach: (hook: (to: BackHandlerRoute, from: BackHandlerRoute, failure?: unknown) => void) => unknown
  onError: (handler: (error: unknown, to: BackHandlerRoute) => void) => unknown
  options: {
    history: {
      state: {
        current?: unknown
      }
    }
  }
}

export interface BackHandlerManager {
  addHandler: (onBack: BackHandler) => () => void
  hasHandlers: () => boolean
  syncHistory: () => void
  connectRouter: (router: BackHandlerRouter) => void
}

interface RegisteredBackHandler {
  onBack: BackHandler
}

interface TraversalResult {
  hasMoved: boolean
  guardId: string | null
}

type TraversalDirection = 'back' | 'forward'

export const BACK_GUARD_STATE_KEY = 'backHandlerGuardId'

const TRAVERSAL_TIMEOUT_MS = 1000
const MAX_SYNC_STEPS = 6

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readGuardId = (state: unknown): string | null => {
  if (!isRecord(state)) {
    return null
  }

  const guardId = state[BACK_GUARD_STATE_KEY]
  return typeof guardId === 'string' ? guardId : null
}

const isUserActivationEvent = (event: Event): boolean => {
  if (!event.isTrusted) {
    return false
  }

  if ('key' in event) {
    return event.key !== 'Escape'
  }

  if ('pointerType' in event) {
    const isMousePointer = event.pointerType === 'mouse'
    return event.type === 'pointerdown' ? isMousePointer : !isMousePointer
  }

  return false
}

export const createBackHandlerManager = (browserWindow: Window = window): BackHandlerManager => {
  const { history } = browserWindow
  const initialScrollRestoration = history.scrollRestoration

  let handlers: ReadonlyArray<RegisteredBackHandler> = []
  let currentGuardId: string | null = null
  let forwardGuardId: string | null = null
  let pageUrl = browserWindow.location.href
  let finishTraversal: ((result: TraversalResult) => void) | null = null
  let navigationTarget: BackHandlerRoute | null = null
  let isWaitingForRouterRestore = false
  let hasActivationSinceLastEntry = false
  let isSyncScheduled = false
  let historyQueue: Promise<void> = Promise.resolve()
  let scrollRestorationTimeoutId: ReturnType<typeof setTimeout> | undefined

  const isOnPageUrl = (): boolean => browserWindow.location.href === pageUrl

  const readCurrentState = (): Record<string, unknown> => {
    const state: unknown = history.state
    return isRecord(state) ? state : {}
  }

  const waitForNextTask = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

  const disableScrollRestoration = (): void => {
    clearTimeout(scrollRestorationTimeoutId)
    history.scrollRestoration = 'manual'
  }

  const restoreScrollRestoration = (): void => {
    clearTimeout(scrollRestorationTimeoutId)
    scrollRestorationTimeoutId = setTimeout(() => {
      history.scrollRestoration = initialScrollRestoration
    }, 0)
  }

  const runExclusive = (task: () => Promise<void>): Promise<void> => {
    historyQueue = historyQueue
      .then(task)
      .catch((error: unknown) => {
        console.error('Failed to sync back handler history', error)
      })

    return historyQueue
  }

  const traverse = (direction: TraversalDirection): Promise<TraversalResult> =>
    new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        finishTraversal = null
        resolve({ hasMoved: false, guardId: null })
      }, TRAVERSAL_TIMEOUT_MS)

      finishTraversal = (result) => {
        clearTimeout(timeoutId)
        finishTraversal = null
        resolve(result)
      }

      if (direction === 'back') {
        history.back()
      }
      else {
        history.forward()
      }
    })

  const pushGuardEntry = (): void => {
    const guardId = crypto.randomUUID()

    disableScrollRestoration()
    history.pushState({ ...readCurrentState(), [BACK_GUARD_STATE_KEY]: guardId }, '')
    currentGuardId = guardId
    forwardGuardId = null
    hasActivationSinceLastEntry = false
  }

  const enterGuardEntry = async (): Promise<boolean> => {
    if (forwardGuardId === null) {
      if (!hasActivationSinceLastEntry) {
        return false
      }

      pushGuardEntry()
      return true
    }

    const expectedGuardId = forwardGuardId
    forwardGuardId = null
    disableScrollRestoration()
    const { hasMoved, guardId } = await traverse('forward')

    if (hasMoved && isOnPageUrl()) {
      currentGuardId = guardId ?? expectedGuardId
      return true
    }

    restoreScrollRestoration()
    return hasMoved ? false : enterGuardEntry()
  }

  const leaveGuardEntry = async (): Promise<void> => {
    const leavingGuardId = currentGuardId
    currentGuardId = null
    const { hasMoved, guardId } = await traverse('back')

    if (!hasMoved || !isOnPageUrl()) {
      return
    }

    if (guardId !== null) {
      currentGuardId = guardId
      return
    }

    forwardGuardId = leavingGuardId
    restoreScrollRestoration()
  }

  const syncGuardEntry = async (remainingSteps: number): Promise<void> => {
    if (remainingSteps === 0 || navigationTarget !== null || isWaitingForRouterRestore) {
      return
    }

    const needsGuardEntry = handlers.length > 0

    if (needsGuardEntry && currentGuardId === null) {
      if (await enterGuardEntry()) {
        await syncGuardEntry(remainingSteps - 1)
      }
      return
    }

    if (!needsGuardEntry && currentGuardId !== null) {
      await leaveGuardEntry()
      await syncGuardEntry(remainingSteps - 1)
    }
  }

  const syncHistory = (): void => {
    if (isSyncScheduled) {
      return
    }

    isSyncScheduled = true
    setTimeout(() => {
      isSyncScheduled = false
      runExclusive(() => syncGuardEntry(MAX_SYNC_STEPS))
    }, 0)
  }

  const requestBack = (source: BackSource): boolean => {
    const topHandler = handlers.at(-1)

    if (!topHandler) {
      return false
    }

    try {
      topHandler.onBack(source)
    }
    catch (error) {
      console.error('Back handler failed', error)
    }

    return true
  }

  const waitForRouterRestore = (): void => {
    isWaitingForRouterRestore = true

    setTimeout(() => {
      if (isWaitingForRouterRestore) {
        isWaitingForRouterRestore = false
        syncHistory()
      }
    }, TRAVERSAL_TIMEOUT_MS)
  }

  const handlePopState = (event: PopStateEvent): void => {
    const landedGuardId = readGuardId(event.state)

    if (finishTraversal) {
      if (isOnPageUrl()) {
        event.stopImmediatePropagation()
      }
      finishTraversal({ hasMoved: true, guardId: landedGuardId })
      return
    }

    if (isWaitingForRouterRestore) {
      isWaitingForRouterRestore = false
      syncHistory()
      return
    }

    const leftGuardId = currentGuardId
    currentGuardId = null
    forwardGuardId = null

    if (!isOnPageUrl()) {
      return
    }

    if (landedGuardId !== null) {
      event.stopImmediatePropagation()
      currentGuardId = landedGuardId
      syncHistory()
      return
    }

    if (leftGuardId !== null) {
      event.stopImmediatePropagation()
      forwardGuardId = leftGuardId
      restoreScrollRestoration()
      syncHistory()
      requestBack('history')
    }
  }

  const handleEscapeKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || event.repeat) {
      return
    }

    if (requestBack('escape')) {
      event.preventDefault()
    }
  }

  const handleUserActivation = (event: Event): void => {
    if (!isUserActivationEvent(event)) {
      return
    }

    hasActivationSinceLastEntry = true

    if (handlers.length > 0 && currentGuardId === null) {
      syncHistory()
    }
  }

  const addHandler = (onBack: BackHandler): (() => void) => {
    const handler: RegisteredBackHandler = { onBack }
    handlers = [...handlers, handler]
    syncHistory()

    return () => {
      handlers = handlers.filter(registeredHandler => registeredHandler !== handler)
      syncHistory()
    }
  }

  const leftoverGuardId = readGuardId(history.state)

  if (leftoverGuardId !== null) {
    history.replaceState({ ...readCurrentState(), [BACK_GUARD_STATE_KEY]: null }, '')
    currentGuardId = leftoverGuardId
  }

  browserWindow.addEventListener('popstate', handlePopState, { capture: true })
  browserWindow.addEventListener('keydown', handleEscapeKeydown)
  browserWindow.addEventListener('keydown', handleUserActivation, { capture: true })
  browserWindow.addEventListener('pointerdown', handleUserActivation, { capture: true })
  browserWindow.addEventListener('pointerup', handleUserActivation, { capture: true })

  const connectRouter = (router: BackHandlerRouter): void => {
    const isHistoryTraversal = (to: BackHandlerRoute, from: BackHandlerRoute): boolean => {
      const currentEntryPath = router.options.history.state?.current
      return !to.redirectedFrom && typeof currentEntryPath === 'string' && currentEntryPath !== from.fullPath
    }

    router.beforeEach(async (to, from) => {
      if (handlers.length > 0 && isHistoryTraversal(to, from)) {
        waitForRouterRestore()
        requestBack('history')
        return false
      }

      navigationTarget = to
      await runExclusive(async () => {
        if (currentGuardId !== null) {
          await leaveGuardEntry()
          await waitForNextTask()
        }
      })

      return true
    })

    router.afterEach((to, _from, failure) => {
      if (navigationTarget === to) {
        navigationTarget = null
      }

      if (!failure) {
        pageUrl = browserWindow.location.href
        forwardGuardId = null
        hasActivationSinceLastEntry = false
      }

      syncHistory()
    })

    router.onError((_error: unknown, to) => {
      if (navigationTarget === to) {
        navigationTarget = null
      }

      syncHistory()
    })
  }

  return {
    addHandler,
    hasHandlers: () => handlers.length > 0,
    syncHistory,
    connectRouter,
  }
}
