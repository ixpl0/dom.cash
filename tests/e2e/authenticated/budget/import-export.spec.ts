import { test, expect } from '../../fixtures'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { initBudget } from '../../helpers/budget-setup'
import { cleanupUserData } from '../../helpers/auth'
import { join } from 'path'
import { readFile, writeFile, unlink, mkdir } from 'fs/promises'

const TEMP_DIR = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'temp')

const ensureTempDir = async () => {
  await mkdir(TEMP_DIR, { recursive: true }).catch(() => {})
}

const createTempFile = async (filename: string, content: string): Promise<string> => {
  await ensureTempDir()
  const filepath = join(TEMP_DIR, filename)
  await writeFile(filepath, content)
  return filepath
}

const cleanupTempFile = async (filepath: string) => {
  await unlink(filepath).catch(() => {})
}

test.describe('Import/Export functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test.describe('Export budget', () => {
    test('should show export button when budget has data', async ({ page }) => {
      await initBudget(page, 'one-month-with-data')

      const exportButton = page.getByTestId('export-button')
      await expect(exportButton).toBeVisible()
    })

    test('should download export file with correct format', async ({ page }) => {
      await initBudget(page, 'one-month-with-data')

      const exportButton = page.getByTestId('export-button')
      await exportButton.click()
      const exportJsonButton = page.getByTestId('export-json-btn')
      await expect(exportJsonButton).toBeVisible()
      const downloadPromise = page.waitForEvent('download')
      await exportJsonButton.click()

      const download = await downloadPromise

      const filename = download.suggestedFilename()
      expect(filename).toMatch(/^budget-\d{4}-\d{2}-\d{2}\.json$/)

      const downloadPath = join(TEMP_DIR, filename)
      await ensureTempDir()
      await download.saveAs(downloadPath)

      const content = await readFile(downloadPath, 'utf-8')
      const exportData = JSON.parse(content)

      expect(exportData.version).toBe('1.0')
      expect(exportData.exportDate).toBeDefined()
      expect(exportData.user).toBeDefined()
      expect(exportData.user.username).toBeDefined()
      expect(exportData.user.mainCurrency).toBe('USD')
      expect(exportData.months).toBeDefined()
      expect(Array.isArray(exportData.months)).toBe(true)
      expect(exportData.months.length).toBeGreaterThan(0)

      const firstMonth = exportData.months[0]
      expect(firstMonth.year).toBeDefined()
      expect(firstMonth.month).toBeDefined()
      expect(firstMonth.entries).toBeDefined()
      expect(Array.isArray(firstMonth.entries)).toBe(true)

      await cleanupTempFile(downloadPath)
    })

    test('should export budget with all entry types', async ({ page }) => {
      await initBudget(page, 'one-month-with-data')

      const exportButton = page.getByTestId('export-button')
      await exportButton.click()
      const exportJsonButton = page.getByTestId('export-json-btn')
      await expect(exportJsonButton).toBeVisible()
      const downloadPromise = page.waitForEvent('download')
      await exportJsonButton.click()

      const download = await downloadPromise
      const downloadPath = join(TEMP_DIR, 'export-all-types.json')
      await ensureTempDir()
      await download.saveAs(downloadPath)

      const content = await readFile(downloadPath, 'utf-8')
      const exportData = JSON.parse(content)

      const entries = exportData.months[0].entries
      const hasBalance = entries.some((e: { kind: string }) => e.kind === 'balance')
      const hasIncome = entries.some((e: { kind: string }) => e.kind === 'income')
      const hasExpense = entries.some((e: { kind: string }) => e.kind === 'expense')

      expect(hasBalance).toBe(true)
      expect(hasIncome).toBe(true)
      expect(hasExpense).toBe(true)

      for (const entry of entries) {
        expect(entry.kind).toMatch(/^(balance|income|expense)$/)
        expect(entry.description).toBeDefined()
        expect(typeof entry.amount).toBe('number')
        expect(entry.currency).toBeDefined()
      }

      await cleanupTempFile(downloadPath)
    })
  })

  test.describe('Import modal UI', () => {
    test('should open import modal from empty state', async ({ page }) => {
      const importButton = page.getByTestId('import-budget-btn')
      await expect(importButton).toBeVisible()
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      await expect(importModal).toBeVisible()

      const fileInput = importModal.getByTestId('import-file-input')
      await expect(fileInput).toBeVisible()
    })

    test('should open import modal from budget header', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const importButton = page.getByTestId('import-button')
      await expect(importButton).toBeVisible()
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      await expect(importModal).toBeVisible()
    })

    test('should close import modal on cancel', async ({ page }) => {
      const importButton = page.getByTestId('import-budget-btn')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      await expect(importModal).toBeVisible()

      const cancelButton = importModal.locator('button.btn-ghost')
      await cancelButton.click()

      await expect(importModal).not.toBeVisible()
    })

    test('should close import modal on Escape key', async ({ page }) => {
      const importButton = page.getByTestId('import-budget-btn')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      await expect(importModal).toBeVisible()

      await page.keyboard.press('Escape')

      await expect(importModal).not.toBeVisible()
    })

    test('should show preview after selecting valid file', async ({ page }) => {
      const budgetPath = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'budgets', 'one-month-with-data.json')

      const importButton = page.getByTestId('import-budget-btn')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      const fileInput = importModal.getByTestId('import-file-input')
      await fileInput.setInputFiles(budgetPath)

      await expect(importModal.getByTestId('import-preview-username')).toContainText('test')
      await expect(importModal.getByTestId('import-preview-currency')).toContainText('USD')

      const submitButton = importModal.getByTestId('import-submit-button')
      await expect(submitButton).toBeEnabled()
    })

    test('should show conflict strategy options after file selection', async ({ page }) => {
      const budgetPath = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'budgets', 'one-month-with-data.json')

      const importButton = page.getByTestId('import-budget-btn')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      const fileInput = importModal.getByTestId('import-file-input')
      await fileInput.setInputFiles(budgetPath)

      const skipRadio = importModal.getByTestId('import-strategy-skip')
      const overwriteRadio = importModal.getByTestId('import-strategy-overwrite')

      await expect(skipRadio).toBeVisible()
      await expect(overwriteRadio).toBeVisible()
      await expect(skipRadio).toBeChecked()
    })
  })

  test.describe('Import with skip strategy', () => {
    test('should skip existing months when using skip strategy', async ({ page }) => {
      await initBudget(page, 'one-month-with-data')

      const balanceButton = page.getByTestId('balance-button').first()
      const originalBalanceText = await balanceButton.textContent()

      const importButton = page.getByTestId('import-button')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      const budgetPath = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'budgets', 'one-month-with-data.json')
      const fileInput = importModal.getByTestId('import-file-input')
      await fileInput.setInputFiles(budgetPath)

      const skipRadio = importModal.getByTestId('import-strategy-skip')
      await expect(skipRadio).toBeChecked()

      const submitButton = importModal.getByTestId('import-submit-button')
      await submitButton.click()

      const closeButton = importModal.getByTestId('import-close-button')
      await expect(closeButton).toBeVisible()
      await closeButton.click()

      await expect(importModal).not.toBeVisible()

      const updatedBalanceText = await balanceButton.textContent()
      expect(updatedBalanceText).toBe(originalBalanceText)
    })

    test('should import new months with skip strategy', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const months = page.getByTestId('budget-month')
      await expect(months).toHaveCount(1)

      const importButton = page.getByTestId('import-button')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      const budgetPath = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'budgets', 'two-months-basic.json')
      const fileInput = importModal.getByTestId('import-file-input')
      await fileInput.setInputFiles(budgetPath)

      const submitButton = importModal.getByTestId('import-submit-button')
      await submitButton.click()

      const closeButton = importModal.getByTestId('import-close-button')
      await expect(closeButton).toBeVisible()
      await closeButton.click()

      await expect(months).toHaveCount(2)
    })
  })

  test.describe('Import with overwrite strategy', () => {
    test('should overwrite existing months when using overwrite strategy', async ({ page }) => {
      await initBudget(page, 'simple')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      const tableRows = modal.locator('tbody tr')
      const originalRowCount = await tableRows.count()

      const closeButton = modal.getByTestId('modal-close-button')
      await closeButton.click()
      await expect(modal).not.toBeVisible()

      const importButton = page.getByTestId('import-button')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      const budgetPath = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'budgets', 'one-month-with-data.json')
      const fileInput = importModal.getByTestId('import-file-input')
      await fileInput.setInputFiles(budgetPath)

      const overwriteRadio = importModal.getByTestId('import-strategy-overwrite')
      await overwriteRadio.check()

      const submitButton = importModal.getByTestId('import-submit-button')
      await submitButton.click()

      const importCloseButton = importModal.getByTestId('import-close-button')
      await expect(importCloseButton).toBeVisible()
      await importCloseButton.click()

      await balanceButton.click()
      await expect(modal).toBeVisible()

      const newRowCount = await tableRows.count()
      expect(newRowCount).not.toBe(originalRowCount)
    })

    test('should show import result with counts', async ({ page }) => {
      const importButton = page.getByTestId('import-budget-btn')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      const budgetPath = join(process.cwd(), 'tests', 'e2e', 'fixtures', 'budgets', 'two-months-basic.json')
      const fileInput = importModal.getByTestId('import-file-input')
      await fileInput.setInputFiles(budgetPath)

      const overwriteRadio = importModal.getByTestId('import-strategy-overwrite')
      await overwriteRadio.check()

      const submitButton = importModal.getByTestId('import-submit-button')
      await submitButton.click()

      await expect(importModal.getByTestId('import-loading')).toBeVisible()

      const closeButton = importModal.getByTestId('import-close-button')
      await expect(closeButton).toBeVisible()

      const resultContainer = importModal.locator('.bg-success')
      await expect(resultContainer).toBeVisible()
    })
  })

  test.describe('Import validation', () => {
    test('should show error for invalid JSON file', async ({ page }) => {
      const invalidContent = 'this is not valid json'
      const tempFilePath = await createTempFile('invalid.json', invalidContent)

      try {
        const importButton = page.getByTestId('import-budget-btn')
        await importButton.click()

        const importModal = page.getByTestId('import-modal')
        const fileInput = importModal.getByTestId('import-file-input')
        await fileInput.setInputFiles(tempFilePath)

        const errorAlert = importModal.locator('.alert-error')
        await expect(errorAlert).toBeVisible()

        const submitButton = importModal.getByTestId('import-submit-button')
        await expect(submitButton).toBeDisabled()
      }
      finally {
        await cleanupTempFile(tempFilePath)
      }
    })

    test('should show error for wrong version', async ({ page }) => {
      const wrongVersionContent = JSON.stringify({
        version: '2.0',
        exportDate: new Date().toISOString(),
        user: { username: 'test', mainCurrency: 'USD' },
        months: [],
      })
      const tempFilePath = await createTempFile('wrong-version.json', wrongVersionContent)

      try {
        const importButton = page.getByTestId('import-budget-btn')
        await importButton.click()

        const importModal = page.getByTestId('import-modal')
        const fileInput = importModal.getByTestId('import-file-input')
        await fileInput.setInputFiles(tempFilePath)

        const errorAlert = importModal.locator('.alert-error')
        await expect(errorAlert).toBeVisible()

        const submitButton = importModal.getByTestId('import-submit-button')
        await expect(submitButton).toBeDisabled()
      }
      finally {
        await cleanupTempFile(tempFilePath)
      }
    })

    test('should disable submit button when no file selected', async ({ page }) => {
      const importButton = page.getByTestId('import-budget-btn')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      const submitButton = importModal.getByTestId('import-submit-button')

      await expect(submitButton).toBeDisabled()
    })
  })

  test.describe('Import and export round-trip', () => {
    test('should preserve data after export and re-import', async ({ page }) => {
      await initBudget(page, 'one-month-with-data')

      const balanceButton = page.getByTestId('balance-button').first()
      const originalBalanceText = await balanceButton.textContent()

      const exportButton = page.getByTestId('export-button')
      await exportButton.click()
      const exportJsonButton = page.getByTestId('export-json-btn')
      await expect(exportJsonButton).toBeVisible()
      const downloadPromise = page.waitForEvent('download')
      await exportJsonButton.click()

      const download = await downloadPromise
      const exportPath = join(TEMP_DIR, 'roundtrip-export.json')
      await ensureTempDir()
      await download.saveAs(exportPath)

      const createMonthButton = page.getByTestId('create-first-month-btn')
        .or(page.getByTestId('add-month-next'))

      await createMonthButton.click()
      const months = page.getByTestId('budget-month')
      await expect(months).toHaveCount(2)

      const importButton = page.getByTestId('import-button')
      await importButton.click()

      const importModal = page.getByTestId('import-modal')
      const fileInput = importModal.getByTestId('import-file-input')
      await fileInput.setInputFiles(exportPath)

      const overwriteRadio = importModal.getByTestId('import-strategy-overwrite')
      await overwriteRadio.check()

      const submitButton = importModal.getByTestId('import-submit-button')
      await submitButton.click()

      const closeButton = importModal.getByTestId('import-close-button')
      await expect(closeButton).toBeVisible()
      await closeButton.click()

      const reImportedBalanceText = await balanceButton.textContent()
      expect(reImportedBalanceText).toBe(originalBalanceText)

      await cleanupTempFile(exportPath)
    })
  })
})
