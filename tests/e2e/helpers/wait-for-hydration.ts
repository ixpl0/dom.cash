import type { Page } from '@playwright/test'

export const waitForHydration = async (page: Page, timeout = 30000) => {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('body[data-hydrated="true"]', { timeout })
}
