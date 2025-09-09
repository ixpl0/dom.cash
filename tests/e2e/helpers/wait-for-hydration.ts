import type { Page } from '@playwright/test'

export const waitForHydration = async (page: Page) => {
  await page.waitForSelector('body[data-hydrated="true"]', { timeout: 5000 })
}
