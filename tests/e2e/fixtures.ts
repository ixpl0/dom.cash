import { test as base, expect } from '@playwright/test'
import { mkdir, access } from 'fs/promises'
import { join } from 'path'
import { waitForHydration } from './helpers/wait-for-hydration'
import { DEV_VERIFICATION_CODE } from './constants'

const AUTH_DIR = '.auth'
const PASSWORD = 'TestPassword123!'
const BASE_URL = process.env.BASE_URL || 'http://localhost:8787'
const SERVER_READY_TIMEOUT = 120000
const SERVER_READY_INTERVAL = 1000

type WorkerCredentials = {
  email: string
  password: string
}

const getStorageStatePath = (workerIndex: number, attemptId: string) =>
  join(process.cwd(), AUTH_DIR, `user-${workerIndex}-${attemptId}.json`)

const getWorkerEmail = (workerIndex: number, uniqueId: string) =>
  `test_worker${workerIndex}_${uniqueId}@example.com`

const ensureAuthDir = async () => {
  const authPath = join(process.cwd(), AUTH_DIR)
  try {
    await access(authPath)
  }
  catch {
    await mkdir(authPath, { recursive: true })
  }
}

const waitForServerReady = async (): Promise<void> => {
  const startTime = Date.now()

  while (Date.now() - startTime < SERVER_READY_TIMEOUT) {
    try {
      const response = await fetch(BASE_URL)
      if (response.ok || response.status < 500) {
        return
      }
    }
    catch {
      await new Promise(resolve => setTimeout(resolve, SERVER_READY_INTERVAL))
    }
  }

  throw new Error(`Server not ready after ${SERVER_READY_TIMEOUT}ms`)
}

export const test = base.extend<
  object,
  { workerCredentials: WorkerCredentials, workerStorageState: string }
>({
  // eslint-disable-next-line no-empty-pattern
  workerCredentials: [async ({ }, use, workerInfo) => {
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const email = getWorkerEmail(workerInfo.workerIndex, uniqueId)

    await use({
      email,
      password: PASSWORD,
    })
  }, { scope: 'worker' }],

  workerStorageState: [async ({ browser, workerCredentials }, use, workerInfo) => {
    await ensureAuthDir()
    await waitForServerReady()

    const staggerDelay = workerInfo.workerIndex * 1000
    if (staggerDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, staggerDelay))
    }

    const attemptId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const storagePath = getStorageStatePath(workerInfo.workerIndex, attemptId)

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
