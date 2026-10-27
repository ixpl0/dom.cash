const DEFAULT_URL = '/todo'
const DEFAULT_TITLE = 'dom.cash'
const ICON_URL = '/icons/icon-192.png'
const BADGE_URL = '/icons/badge-96.png'
const JSON_HEADERS = { 'Content-Type': 'application/json' }
const IGNORED_URL_CHARACTERS = /[\t\n\r]/g
const SCHEME_RELATIVE_START = /^[\\/]{2}/

const readMessage = (event) => {
  try {
    const message = event.data ? event.data.json() : null
    return message && typeof message.title === 'string' ? message : null
  }
  catch {
    return null
  }
}

const showMessage = (message) => {
  if (!message) {
    return self.registration.showNotification(DEFAULT_TITLE, { icon: ICON_URL, badge: BADGE_URL, data: { url: DEFAULT_URL } })
  }

  return self.registration.showNotification(message.title, {
    body: message.body,
    tag: message.tag,
    renotify: Boolean(message.tag) && !message.isSilent,
    silent: Boolean(message.isSilent),
    icon: ICON_URL,
    badge: BADGE_URL,
    data: { url: message.url || DEFAULT_URL },
  })
}

const getAppWindows = async () => {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  return windows.filter(client => new URL(client.url).origin === self.location.origin)
}

const toAppPath = (url) => {
  if (typeof url !== 'string' || !url.startsWith('/') || SCHEME_RELATIVE_START.test(url.replace(IGNORED_URL_CHARACTERS, ''))) {
    return null
  }

  try {
    const parsed = new URL(url, self.location.origin)
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return parsed.origin === self.location.origin && !path.startsWith('//') ? path : null
  }
  catch {
    return null
  }
}

const openApp = async (url) => {
  const appPath = toAppPath(url) ?? DEFAULT_URL
  const [appWindow] = await getAppWindows()

  if (!appWindow) {
    await self.clients.openWindow(appPath)
    return
  }

  await appWindow.focus()
  appWindow.postMessage({ type: 'navigate', url: appPath })
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
  const { notification } = event
  const { url } = { url: DEFAULT_URL, ...notification.data }

  notification.close()
  event.waitUntil(openApp(url))
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(renewSubscription(event))
})
