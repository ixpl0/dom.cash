import { test as base, expect } from '@playwright/test'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { waitForHydration } from './helpers/wait-for-hydration'
import { createTestEmail, createUniqueId } from './helpers/users'
import { AUTH_DIR, BASE_URL, DEV_VERIFICATION_CODE } from './constants'

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
      await page.goto('/auth', { timeout: 60000 })
      await waitForHydration(page)

      const emailInput = page.locator('[data-testid="email-input"]').first()
      await emailInput.waitFor({ state: 'visible', timeout: 15000 })
      await emailInput.fill(workerCredentials.email)

      const passwordInput = page.locator('[data-testid="password-input"]').first()
      await passwordInput.fill(workerCredentials.password)

      const registerBtn = page.locator('[data-testid="register-btn"]').first()
      await registerBtn.click()

      const verificationInput = page.locator('[data-testid="verification-code-input"]').first()
      await verificationInput.waitFor({ state: 'visible', timeout: 30000 })
      await verificationInput.fill(DEV_VERIFICATION_CODE)

      const verifyBtn = page.locator('[data-testid="verify-code-btn"]').first()
      await verifyBtn.click()

      await page.waitForURL('/', { timeout: 30000 })
      await waitForHydration(page)

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
