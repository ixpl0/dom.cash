const DEFAULT_URL = '/todo'
const DEFAULT_TITLE = 'dom.cash'
const ICON_URL = '/icons/icon-192.png'
const BADGE_URL = '/icons/badge-96.png'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

const readMessage = (event) => {
  try {
    const message = event.data ? event.data.json() : null
    return message && typeof message.title === 'string' ? message : null
  }
  catch {
    return null
  }
}

const toLocalIsoDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTomorrow = () => {
  const now = new Date()
  return toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
}

const showMessage = (message) => {
  if (!message) {
    return self.registration.showNotification(DEFAULT_TITLE, { icon: ICON_URL, badge: BADGE_URL, data: { url: DEFAULT_URL, todo: null } })
  }

  return self.registration.showNotification(message.title, {
    body: message.body,
    tag: message.tag,
    renotify: Boolean(message.tag) && !message.isSilent,
    silent: Boolean(message.isSilent),
    icon: ICON_URL,
    badge: BADGE_URL,
    data: { url: message.url || DEFAULT_URL, todo: message.todo || null },
    actions: Array.isArray(message.actions) ? message.actions : [],
  })
}

const getAppWindows = async () => {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  return windows.filter(client => new URL(client.url).origin === self.location.origin)
}

const openApp = async (url) => {
  const [appWindow] = await getAppWindows()

  if (!appWindow) {
    await self.clients.openWindow(url)
    return
  }

  await appWindow.focus()
  appWindow.postMessage({ type: 'navigate', url })
}

const announceTodoChange = async () => {
  const windows = await getAppWindows()
  windows.forEach(client => client.postMessage({ type: 'todo-changed' }))
}

const createTodoRequest = (action, todo) => {
  const todoPath = `/api/todo/${encodeURIComponent(todo.id)}`

  switch (action) {
    case 'complete': {
      return { path: `${todoPath}/completion`, body: { isCompleted: true, plannedDate: todo.plannedDate } }
    }
    case 'postpone': {
      return { path: `${todoPath}/planned-date`, body: { plannedDate: todo.plannedDate, newPlannedDate: getTomorrow() } }
    }
    default: {
      return null
    }
  }
}

const runTodoAction = async (action, { url, todo }) => {
  const request = todo ? createTodoRequest(action, todo) : null

  if (!request) {
    await openApp(url)
    return
  }

  try {
    const response = await fetch(request.path, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(request.body),
      credentials: 'same-origin',
    })

    if (!response.ok) {
      await openApp(url)
      return
    }

    await announceTodoChange()
  }
  catch {
    await openApp(url)
  }
}

const renewSubscription = async (event) => {
  const options = event.oldSubscription ? event.oldSubscription.options : null
  const subscription = event.newSubscription || (options ? await self.registration.pushManager.subscribe(options) : null)

  if (!subscription) {
    return
  }

  await fetch('/api/push/subscription', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ ...subscription.toJSON(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    credentials: 'same-origin',
  })
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  event.waitUntil(showMessage(readMessage(event)))
})

self.addEventListener('notificationclick', (event) => {
  const { notification, action } = event
  const data = { url: DEFAULT_URL, todo: null, ...notification.data }

  notification.close()
  event.waitUntil(action ? runTodoAction(action, data) : openApp(data.url))
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(renewSubscription(event))
})
