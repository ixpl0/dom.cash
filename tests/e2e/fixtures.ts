import { test as base, expect } from '@playwright/test'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { createTestEmail, createUniqueId } from './helpers/users'
import { AUTH_DIR, BASE_URL } from './constants'
import { registerUser } from './helpers/auth'

const PASSWORD = 'TestPassword123!'
const SERVER_READY_TIMEOUT = 120000
const SERVER_READY_INTERVAL = 1000
const WORKER_STAGGER_DELAY = 1000

type WorkerCredentials = {
  email: string
  password: string
}

const getStorageStatePath = (parallelIndex: number) =>
  join(AUTH_DIR, `user-${parallelIndex}-${createUniqueId()}.json`)

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))

const isServerReady = async (): Promise<boolean> => {
  try {
    const response = await fetch(BASE_URL)
    await response.body?.cancel()
    return response.status < 500
  }
  catch {
    return false
  }
}

const waitForServerReady = async (): Promise<void> => {
  const deadline = Date.now() + SERVER_READY_TIMEOUT

  while (Date.now() < deadline) {
    if (await isServerReady()) {
      return
    }
    await wait(SERVER_READY_INTERVAL)
  }

  throw new Error(`Server not ready after ${SERVER_READY_TIMEOUT}ms`)
}

export const test = base.extend<
  object,
  { workerCredentials: WorkerCredentials, workerStorageState: string }
>({
  // eslint-disable-next-line no-empty-pattern
  workerCredentials: [async ({ }, use, workerInfo) => {
    await use({
      email: createTestEmail(`worker${workerInfo.parallelIndex}`),
      password: PASSWORD,
    })
  }, { scope: 'worker' }],

  workerStorageState: [async ({ browser, workerCredentials }, use, workerInfo) => {
    await mkdir(AUTH_DIR, { recursive: true })
    await waitForServerReady()
    await wait(workerInfo.parallelIndex * WORKER_STAGGER_DELAY)

    const storagePath = getStorageStatePath(workerInfo.parallelIndex)

    const context = await browser.newContext({ baseURL: BASE_URL })
    const page = await context.newPage()

    try {
      await registerUser(page, workerCredentials.email, workerCredentials.password)
      await context.storageState({ path: storagePath })
    }
    finally {
      await context.close().catch(() => {})
    }

    await use(storagePath)
  }, { scope: 'worker' }],

  storageState: async ({ workerStorageState }, use) => {
    await use(workerStorageState)
  },
})

export { expect }
