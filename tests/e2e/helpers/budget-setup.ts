import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'

export const initBudget = async (page: Page, budgetFixtureName: string) => {
  const budgetPath = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'budgets', `${budgetFixtureName}.json`)
  const budgetData = JSON.parse(readFileSync(budgetPath, 'utf-8'))
  const fs = await import('fs/promises')

  const importButton = page.getByTestId('import-budget-btn').or(page.getByTestId('import-button'))
  await expect(importButton).toBeVisible()
  await importButton.click()

  const importModal = page.getByTestId('import-modal')
  await expect(importModal).toBeVisible()

  const tempFilePath = `./${budgetFixtureName}-temp.json`
  await fs.writeFile(tempFilePath, JSON.stringify(budgetData, null, 2))

  const fileInput = importModal.getByTestId('import-file-input')
  await fileInput.setInputFiles(tempFilePath)

  const submitButton = importModal.getByTestId('import-submit-button')
  await expect(submitButton).toBeEnabled()
  await submitButton.click()

  await expect(importModal.getByTestId('import-loading')).toBeVisible()

  const closeButton = importModal.getByTestId('import-close-button')
  await expect(closeButton).toBeVisible()
  await closeButton.click()
  await expect(importModal).not.toBeVisible()

  await fs.unlink(tempFilePath).catch(() => {})
}
