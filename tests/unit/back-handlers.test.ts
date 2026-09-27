import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BACK_GUARD_STATE_KEY,
  createBackHandlerManager,
  type BackHandlerRoute,
  type BackHandlerRouter,
  type BackSource,
} from '../../app/utils/back-handlers'

const ORIGIN = 'https://dom.test'

interface HistoryEntry {
  url: string
  state: Record<string, unknown>
}

interface FakeEvent {
  type: string
  isTrusted: boolean
  isComposing: boolean
  repeat: boolean
  state?: unknown
  key?: string
  pointerType?: string
  readonly defaultPrevented: boolean
  readonly isStopped: boolean
  preventDefault: () => void
  stopImmediatePropagation: () => void
}

type FakeListener = (event: FakeEvent) => void

interface RegisteredListener {
  type: string
  listener: FakeListener
}

type RouteGuard = Parameters<BackHandlerRouter['beforeEach']>[0]
type RouteHook = Parameters<BackHandlerRouter['afterEach']>[0]

const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 120))

const createEvent = (type: string, properties: Partial<FakeEvent> = {}): FakeEvent => {
  let isDefaultPrevented = false
  let isPropagationStopped = false

  return {
    type,
    isTrusted: true,
    isComposing: false,
    repeat: false,
    ...properties,
    get defaultPrevented() {
      return isDefaultPrevented
    },
    get isStopped() {
      return isPropagationStopped
    },
    preventDefault: () => {
      isDefaultPrevented = true
    },
    stopImmediatePropagation: () => {
      isPropagationStopped = true
    },
  }
}

const createRouterState = (path: string, position: number): Record<string, unknown> => ({
  back: null,
  current: path,
  forward: null,
  position,
  replaced: false,
  scroll: null,
})

const createBrowser = (initialEntries: HistoryEntry[], initialIndex = initialEntries.length - 1) => {
  let entries = initialEntries
  let index = initialIndex
  let listeners: RegisteredListener[] = []
  let scrollRestoration: ScrollRestoration = 'auto'

  const currentEntry = (): HistoryEntry => {
    const entry = entries[index]
    if (!entry) {
      throw new Error(`Missing history entry ${index}`)
    }
    return entry
  }

  const dispatch = (event: FakeEvent): FakeEvent => {
    listeners
      .filter(item => item.type === event.type)
      .some((item) => {
        item.listener(event)
        return event.isStopped
      })

    return event
  }

  const traverseBy = (delta: number): void => {
    const targetIndex = index + delta
    if (!entries[targetIndex]) {
      return
    }

    setTimeout(() => {
      index = targetIndex
      dispatch(createEvent('popstate', { state: structuredClone(currentEntry().state) }))
    }, 1)
  }

  const history = {
    get state() {
      return currentEntry().state
    },
    get length() {
      return entries.length
    },
    get scrollRestoration() {
      return scrollRestoration
    },
    set scrollRestoration(value: ScrollRestoration) {
      scrollRestoration = value
    },
    pushState: (state: Record<string, unknown>, _unused: string, url?: string) => {
      entries = [...entries.slice(0, index + 1), { url: url ?? currentEntry().url, state: structuredClone(state) }]
      index += 1
    },
    replaceState: (state: Record<string, unknown>, _unused: string, url?: string) => {
      entries = entries.map((entry, entryIndex) =>
        entryIndex === index ? { url: url ?? entry.url, state: structuredClone(state) } : entry,
      )
    },
    back: () => traverseBy(-1),
    forward: () => traverseBy(1),
    go: (delta = 0) => traverseBy(delta),
  }

  const browserWindow = {
    history,
    location: {
      get href() {
        return currentEntry().url
      },
    },
    addEventListener: (type: string, listener: FakeListener) => {
      listeners = [...listeners, { type, listener }]
    },
  }

  return {
    window: browserWindow as unknown as Window,
    history,
    dispatch,
    activate: () => dispatch(createEvent('pointerdown', { pointerType: 'mouse' })),
    pressEscape: (properties: Partial<FakeEvent> = {}) => dispatch(createEvent('keydown', { key: 'Escape', ...properties })),
    userBack: () => traverseBy(-1),
    userForward: () => traverseBy(1),
    getIndex: () => index,
    getEntries: () => entries,
    getUrl: () => currentEntry().url,
    getScrollRestoration: () => scrollRestoration,
  }
}

type FakeBrowser = ReturnType<typeof createBrowser>

const createRouter = (browser: FakeBrowser, initialPath: string) => {
  let beforeGuards: RouteGuard[] = []
  let afterHooks: RouteHook[] = []
  let currentRoute: BackHandlerRoute = { fullPath: initialPath }
  let routerState = browser.history.state
  let receivedPopStates = 0
  let isIgnoringNextPopState = false

  const router: BackHandlerRouter = {
    beforeEach: (guard) => {
      beforeGuards = [...beforeGuards, guard]
    },
    afterEach: (hook) => {
      afterHooks = [...afterHooks, hook]
    },
    onError: () => undefined,
    options: {
      history: {
        get state() {
          return routerState
        },
      },
    },
  }

  const runGuards = (to: BackHandlerRoute, from: BackHandlerRoute): Promise<boolean> =>
    beforeGuards.reduce<Promise<boolean>>(
      async (previousResult, guard) => (await previousResult) && guard(to, from),
      Promise.resolve(true),
    )

  const runAfterHooks = (to: BackHandlerRoute, from: BackHandlerRoute, failure?: unknown): void => {
    afterHooks.forEach(hook => hook(to, from, failure))
  }

  const push = async (path: string): Promise<void> => {
    const to = { fullPath: path }
    const from = currentRoute

    if (!(await runGuards(to, from))) {
      runAfterHooks(to, from, 'aborted')
      return
    }

    browser.history.replaceState({ ...routerState, ...browser.history.state, forward: path }, '')
    routerState = createRouterState(path, Number(routerState.position) + 1)
    browser.history.pushState(routerState, '', `${ORIGIN}${path}`)
    currentRoute = to
    runAfterHooks(to, from)
  }

  const handlePopState = async (event: FakeEvent): Promise<void> => {
    receivedPopStates += 1
    const fromState = routerState
    const state = event.state as Record<string, unknown>
    routerState = state

    if (isIgnoringNextPopState) {
      isIgnoringNextPopState = false
      return
    }

    const to = { fullPath: String(state.current) }
    const from = currentRoute

    if (!(await runGuards(to, from))) {
      isIgnoringNextPopState = true
      browser.history.go(Number(fromState.position) - Number(state.position))
      runAfterHooks(to, from, 'aborted')
      return
    }

    currentRoute = to
    runAfterHooks(to, from)
  }

  browser.window.addEventListener('popstate', (event: Event) => {
    handlePopState(event as unknown as FakeEvent)
  })

  return {
    router,
    push,
    getCurrentPath: () => currentRoute.fullPath,
    getReceivedPopStates: () => receivedPopStates,
  }
}

const setup = (initialEntries?: HistoryEntry[], initialIndex?: number) => {
  const browser = createBrowser(
    initialEntries ?? [{ url: `${ORIGIN}/budget`, state: createRouterState('/budget', 0) }],
    initialIndex,
  )
  const initialPath = String(browser.history.state.current)
  const manager = createBackHandlerManager(browser.window)
  const fakeRouter = createRouter(browser, initialPath)
  manager.connectRouter(fakeRouter.router)

  return { browser, fakeRouter, manager }
}

const createBackRecorder = () => {
  let calls: string[] = []

  return {
    record: (name: string) => (source: BackSource) => {
      calls = [...calls, `${name}:${source}`]
    },
    getCalls: () => calls,
  }
}

const readGuardId = (entry: HistoryEntry | undefined): unknown => entry?.state[BACK_GUARD_STATE_KEY]

test('adds a guard entry for the page after user activation', async () => {
  const { browser, manager } = setup()

  browser.activate()
  manager.addHandler(() => undefined)
  await settle()

  assert.equal(browser.getEntries().length, 2)
  assert.equal(browser.getIndex(), 1)
  assert.equal(browser.getUrl(), `${ORIGIN}/budget`)
  assert.equal(typeof readGuardId(browser.getEntries()[1]), 'string')
  assert.equal(browser.getEntries()[1]?.state.position, 0)
  assert.equal(browser.getScrollRestoration(), 'manual')
})

test('waits for user activation before adding a history entry', async () => {
  const { browser, manager } = setup()

  manager.addHandler(() => undefined)
  await settle()
  assert.equal(browser.getEntries().length, 1)

  browser.activate()
  await settle()
  assert.equal(browser.getEntries().length, 2)
  assert.equal(browser.getIndex(), 1)
})

test('runs only the top handler on browser back and keeps the page', async () => {
  const { browser, fakeRouter, manager } = setup()
  const recorder = createBackRecorder()

  browser.activate()
  manager.addHandler(recorder.record('modal'))
  const removeEditMode = manager.addHandler((source) => {
    recorder.record('editMode')(source)
    removeEditMode()
  })
  await settle()

  browser.userBack()
  await settle()

  assert.deepEqual(recorder.getCalls(), ['editMode:history'])
  assert.equal(fakeRouter.getReceivedPopStates(), 0)
  assert.equal(fakeRouter.getCurrentPath(), '/budget')
  assert.equal(browser.getEntries().length, 2)
  assert.equal(browser.getIndex(), 1)

  browser.userBack()
  await settle()

  assert.deepEqual(recorder.getCalls(), ['editMode:history', 'modal:history'])
  assert.equal(fakeRouter.getReceivedPopStates(), 0)
})

test('keeps intercepting back while a confirmation is cancelled repeatedly', async () => {
  const { browser, fakeRouter, manager } = setup()
  const recorder = createBackRecorder()

  browser.activate()
  manager.addHandler(recorder.record('modal'))
  await settle()

  const cancelConfirmation = (): void => {
    const removeConfirmation = manager.addHandler((source) => {
      recorder.record('confirmation')(source)
      removeConfirmation()
    })
  }

  cancelConfirmation()
  browser.userBack()
  await settle()
  cancelConfirmation()
  browser.userBack()
  await settle()

  assert.deepEqual(recorder.getCalls(), ['confirmation:history', 'confirmation:history'])
  assert.equal(fakeRouter.getReceivedPopStates(), 0)
  assert.equal(browser.getEntries().length, 2)
  assert.equal(browser.getIndex(), 1)
})

test('removes the guard entry when the last handler closes from the UI', async () => {
  const { browser, fakeRouter, manager } = setup()

  browser.activate()
  const removeHandler = manager.addHandler(() => undefined)
  await settle()

  removeHandler()
  await settle()

  assert.equal(browser.getIndex(), 0)
  assert.equal(browser.getEntries().length, 2)
  assert.equal(fakeRouter.getReceivedPopStates(), 0)
  assert.equal(browser.getScrollRestoration(), 'auto')
})

test('reuses the forward guard entry without user activation', async () => {
  const { browser, manager } = setup()

  browser.activate()
  const removeHandler = manager.addHandler(() => undefined)
  await settle()
  removeHandler()
  await settle()

  manager.addHandler(() => undefined)
  await settle()

  assert.equal(browser.getEntries().length, 2)
  assert.equal(browser.getIndex(), 1)
})

test('leaves the guard entry before router navigation', async () => {
  const { browser, fakeRouter, manager } = setup()

  browser.activate()
  manager.addHandler(() => undefined)
  await settle()

  browser.activate()
  await fakeRouter.push('/todo')
  await settle()

  assert.deepEqual(browser.getEntries().map(entry => entry.url), [`${ORIGIN}/budget`, `${ORIGIN}/todo`])
  assert.equal(browser.getIndex(), 1)
  assert.equal(readGuardId(browser.getEntries()[0]), undefined)
})

test('reports whether a handler is open', () => {
  const { manager } = setup()

  assert.equal(manager.hasHandlers(), false)
  const removeHandler = manager.addHandler(() => undefined)
  assert.equal(manager.hasHandlers(), true)
  removeHandler()
  assert.equal(manager.hasHandlers(), false)
})

test('routes Escape to the top handler only', () => {
  const { browser, manager } = setup()
  const recorder = createBackRecorder()

  manager.addHandler(recorder.record('modal'))
  manager.addHandler(recorder.record('confirmation'))
  const event = browser.pressEscape()

  assert.deepEqual(recorder.getCalls(), ['confirmation:escape'])
  assert.equal(event.defaultPrevented, true)
})

test('ignores Escape that a component already handled', () => {
  const { browser, manager } = setup()
  const recorder = createBackRecorder()
  const event = createEvent('keydown', { key: 'Escape' })

  manager.addHandler(recorder.record('modal'))
  event.preventDefault()
  browser.dispatch(event)

  assert.deepEqual(recorder.getCalls(), [])
})

test('cancels router back navigation while an unguarded handler is open', async () => {
  const { browser, fakeRouter, manager } = setup()
  const recorder = createBackRecorder()

  browser.activate()
  await fakeRouter.push('/todo')
  manager.addHandler(recorder.record('modal'))
  await settle()
  assert.equal(browser.getEntries().length, 2)

  browser.userBack()
  await settle()

  assert.deepEqual(recorder.getCalls(), ['modal:history'])
  assert.equal(fakeRouter.getCurrentPath(), '/todo')
  assert.equal(browser.getUrl(), `${ORIGIN}/todo`)
})

test('lets the router handle back navigation when nothing is open', async () => {
  const { browser, fakeRouter } = setup()

  browser.activate()
  await fakeRouter.push('/todo')
  browser.userBack()
  await settle()

  assert.equal(fakeRouter.getCurrentPath(), '/budget')
  assert.equal(fakeRouter.getReceivedPopStates(), 1)
})

test('skips a forward guard entry the user returns to', async () => {
  const { browser, fakeRouter, manager } = setup()

  browser.activate()
  const removeHandler = manager.addHandler(() => {
    removeHandler()
  })
  await settle()
  browser.userBack()
  await settle()

  browser.userForward()
  await settle()

  assert.equal(browser.getIndex(), 0)
  assert.equal(fakeRouter.getReceivedPopStates(), 0)
})

test('leaves a guard entry restored after page reload', async () => {
  const pageState = createRouterState('/budget', 0)
  const { browser, fakeRouter, manager } = setup([
    { url: `${ORIGIN}/budget`, state: pageState },
    { url: `${ORIGIN}/budget`, state: { ...pageState, [BACK_GUARD_STATE_KEY]: 'guard-from-previous-load' } },
  ])

  assert.equal(readGuardId(browser.getEntries()[1]), null)

  manager.syncHistory()
  await settle()

  assert.equal(browser.getIndex(), 0)
  assert.equal(fakeRouter.getReceivedPopStates(), 0)
})
