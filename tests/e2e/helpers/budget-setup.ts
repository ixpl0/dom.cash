import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { waitForHydration } from './wait-for-hydration'

const readBudgetFixture = async (budgetFixtureName: string): Promise<unknown> => {
  const budgetPath = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'budgets', `${budgetFixtureName}.json`)
  return JSON.parse(await readFile(budgetPath, 'utf8'))
}

export const initBudget = async (page: Page, budgetFixtureName: string): Promise<void> => {
  const response = await page.request.post('/api/budget/import', {
    data: {
      data: await readBudgetFixture(budgetFixtureName),
      options: { strategy: 'overwrite' },
    },
  })
  expect(response.ok()).toBe(true)

  await page.reload()
  await waitForHydration(page)
}
