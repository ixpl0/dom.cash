import { expect, type Page } from '@playwright/test'

const BACK_GUARD_STATE_KEY = 'backHandlerGuardId'

export const waitForBackGuard = async (page: Page): Promise<void> => {
  await expect.poll(() => page.evaluate((guardStateKey) => {
    const state: unknown = window.history.state
    return typeof state === 'object' && state !== null && guardStateKey in state
      && typeof (state as Record<string, unknown>)[guardStateKey] === 'string'
  }, BACK_GUARD_STATE_KEY)).toBe(true)
}

export const pressBrowserBack = async (page: Page): Promise<void> => {
  await waitForBackGuard(page)
  await page.goBack()
}
