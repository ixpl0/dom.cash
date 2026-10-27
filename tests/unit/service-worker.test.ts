import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createContext, runInContext } from 'node:vm'
import { isAppPath, sanitizeRedirectPath } from '../../shared/utils/shared/redirect'
import { APP_PATH_CASES, FOREIGN_ADDRESSES, SITE_HOST } from './helpers/redirect-cases'

type Listener = (event: object) => void

interface WorkerCall {
  name: string
  args: unknown[]
}

const serviceWorkerSource = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')

const loadServiceWorker = () => {
  let listeners: Record<string, Listener> = {}
  let calls: WorkerCall[] = []
  const record = (name: string) => async (...args: unknown[]): Promise<void> => {
    const copiedArgs: unknown[] = JSON.parse(JSON.stringify(args))
    calls = [...calls, { name, args: copiedArgs }]
  }
  const context = createContext({
    self: {
      location: { origin: `https://${SITE_HOST}` },
      addEventListener: (type: string, listener: Listener) => {
        listeners = { ...listeners, [type]: listener }
      },
      registration: { showNotification: record('showNotification') },
      clients: { matchAll: async () => [], openWindow: record('openWindow') },
    },
    fetch: record('fetch'),
    URL,
  })
  runInContext(serviceWorkerSource, context)

  const dispatch = async (type: string, event: object): Promise<void> => {
    let pending: unknown
    listeners[type]?.({
      ...event,
      waitUntil: (promise: unknown) => {
        pending = promise
      },
    })
    await pending
  }

  return { context, record, dispatch, getCalls: () => calls }
}

test('the service worker opens only the paths that sanitizeRedirectPath keeps', () => {
  const { context } = loadServiceWorker()
  const addresses = APP_PATH_CASES.map(({ address }) => address).concat(FOREIGN_ADDRESSES)
  const openedPaths: unknown = runInContext(`JSON.stringify(${JSON.stringify(addresses)}.map(toAppPath))`, context)

  assert.equal(typeof openedPaths, 'string')
  assert.deepEqual(
    JSON.parse(String(openedPaths)),
    addresses.map(address => (isAppPath(address) ? sanitizeRedirectPath(address) : null)),
  )
})

test('the service worker shows notifications without buttons and opens the app on any tap', async () => {
  const worker = loadServiceWorker()
  const previousVersionMessage = {
    title: '1 task for today',
    body: 'Pay for the internet',
    tag: 'todo-digest',
    url: '/todo',
    isSilent: true,
    todo: { id: 'internet', plannedDate: '2026-10-27' },
    actions: [{ action: 'complete', title: 'Done' }, { action: 'postpone', title: 'Tomorrow' }],
  }

  await worker.dispatch('push', { data: { json: () => previousVersionMessage } })
  await worker.dispatch('notificationclick', {
    action: 'complete',
    notification: { data: { url: '/todo', todo: previousVersionMessage.todo }, close: worker.record('close') },
  })

  assert.deepEqual(worker.getCalls(), [
    {
      name: 'showNotification',
      args: ['1 task for today', {
        body: 'Pay for the internet',
        tag: 'todo-digest',
        renotify: false,
        silent: true,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        data: { url: '/todo' },
      }],
    },
    { name: 'close', args: [] },
    { name: 'openWindow', args: ['/todo'] },
  ])
})
