import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { acceptConfirmModal } from '../../helpers/confirmation'

test.describe.serial('Budget page historical testing', () => {
  test('should create first month', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const emptyState = page.getByTestId('budget-empty-state')
    await expect(emptyState).toBeVisible()

    const createFirstMonthButton = page.getByTestId('create-first-month-btn')
    await expect(createFirstMonthButton).toBeVisible()
    await createFirstMonthButton.click()

    const timeline = page.getByTestId('budget-timeline')
    await expect(timeline).toBeVisible()

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(1)

    const balanceButton = page.getByTestId('balance-button').first()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const addButton = modal.getByTestId('add-entry-button')
    await addButton.click()

    const descriptionInput = modal.getByTestId('entry-description-input')
    await descriptionInput.fill('Chilean Pesos Balance')

    const amountInput = modal.getByTestId('entry-amount-input')
    await amountInput.fill('1000000000')

    const currencySelect = modal.getByTestId('currency-select')
    await currencySelect.click()
    await currencySelect.fill('CLP')
    await page.keyboard.press('Enter')

    const saveRowButton = modal.getByTestId('entry-save-button')
    await saveRowButton.click()

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()
    await expect(modal).not.toBeVisible()
  })

  test('should add previous month and ensure same year setup', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const addMonthPreviousButton = page.getByTestId('add-month-previous')
    await addMonthPreviousButton.click()
    await expect(page.getByTestId('budget-month')).toHaveCount(2)

    const yearElements = page.getByTestId('budget-year')
    const yearCount = await yearElements.count()

    if (yearCount > 1) {
      await addMonthPreviousButton.click()
      await expect(page.getByTestId('budget-month')).toHaveCount(3)

      const months = page.getByTestId('budget-month')
      const topMonth = months.first()
      const deleteButton = topMonth.getByTestId('delete-month-button')

      await deleteButton.click()
      await acceptConfirmModal(page)
      await expect(page.getByTestId('budget-month')).toHaveCount(2)
    }

    const finalYearElements = page.getByTestId('budget-year')
    const finalYearCount = await finalYearElements.count()
    expect(finalYearCount).toBe(1)

    const finalMonths = page.getByTestId('budget-month')
    await expect(finalMonths).toHaveCount(2)
  })

  test('should display currency fluctuations in second month and year stats with same non-zero values', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const months = page.getByTestId('budget-month')
    const secondMonth = months.nth(1)
    const yearElements = page.getByTestId('budget-year')
    const firstYear = yearElements.first()

    const currencyProfitLossButton = secondMonth.getByTestId('currency-fluctuation-button')
    const yearTotalCurrencyElement = firstYear.getByTestId('year-total-currency-profit-loss')
    const yearAverageCurrencyElement = firstYear.getByTestId('year-average-currency-profit-loss')

    await expect(currencyProfitLossButton).toBeVisible()
    await expect(yearTotalCurrencyElement).toBeVisible()
    await expect(yearAverageCurrencyElement).toBeVisible()

    const monthCurrencyText = await currencyProfitLossButton.textContent()
    const yearTotalCurrencyText = await yearTotalCurrencyElement.textContent()
    const yearAverageCurrencyText = await yearAverageCurrencyElement.textContent()

    const monthCurrencyValue = parseInt(monthCurrencyText?.replace(/[^-\d]/g, ''), 10)
    const yearTotalCurrencyValue = parseInt(yearTotalCurrencyText?.replace(/[^-\d]/g, ''), 10)
    const yearAverageCurrencyValue = parseInt(yearAverageCurrencyText?.replace(/[^-\d]/g, ''), 10)

    expect(monthCurrencyValue).not.toBe(0)
    expect(yearTotalCurrencyValue).toBe(monthCurrencyValue)
    expect(yearAverageCurrencyValue).toBe(monthCurrencyValue)
  })

  test('should open chart modal with canvas and close it', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const chartButton = page.getByTestId('chart-button')
    await expect(chartButton).toBeVisible()
    await chartButton.click()

    const chartModal = page.getByTestId('chart-modal')
    await expect(chartModal).toBeVisible()

    const canvas = chartModal.locator('canvas')
    await expect(canvas).toBeVisible()

    const closeButton = chartModal.getByTestId('chart-modal-close-button')
    await closeButton.click()
    await expect(chartModal).not.toBeVisible()
  })

  test('should export budget data as JSON file', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const downloadPromise = page.waitForEvent('download')

    const exportButton = page.getByTestId('export-button')
    await expect(exportButton).toBeVisible()
    await exportButton.click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/budget.*\.json$/)

    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const savedPath = './test-export.json'
    await download.saveAs(savedPath)

    const fs = await import('fs/promises')
    const fileContent = await fs.readFile(savedPath, 'utf-8')
    const exportedData = JSON.parse(fileContent)

    expect(exportedData).toHaveProperty('user')
    expect(exportedData).toHaveProperty('months')
    expect(exportedData.months).toHaveLength(2)

    await fs.unlink(savedPath).catch(() => {})
  })

  test('should import budget data and restore months', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    await expect(page.getByTestId('budget-month')).toHaveCount(2)

    const yearElements = page.getByTestId('budget-year')
    const firstYear = yearElements.first()
    const yearAverageBalanceElement = firstYear.getByTestId('year-average-balance')
    const originalAverageBalanceText = await yearAverageBalanceElement.textContent()
    const originalAverageBalance = parseInt(originalAverageBalanceText?.replace(/[^-\d]/g, ''), 10)

    const downloadPromise = page.waitForEvent('download')
    const exportButton = page.getByTestId('export-button')
    await exportButton.click()
    const download = await downloadPromise
    const exportPath = './budget-for-import.json'
    await download.saveAs(exportPath)

    const months = page.getByTestId('budget-month')
    const firstMonth = months.first()

    const firstDeleteButton = firstMonth.getByTestId('delete-month-button')
    await firstDeleteButton.click()
    await confirmModal(page)
    await expect(page.getByTestId('budget-month')).toHaveCount(1)

    const remainingMonth = page.getByTestId('budget-month').first()
    const secondDeleteButton = remainingMonth.getByTestId('delete-month-button')
    await secondDeleteButton.click()
    await confirmModal(page)

    const emptyState = page.getByTestId('budget-empty-state')
    await expect(emptyState).toBeVisible()

    const importButton = page.getByTestId('import-budget-btn')
    await importButton.click()

    const importModal = page.getByTestId('import-modal')
    await expect(importModal).toBeVisible()

    const fileInput = importModal.getByTestId('import-file-input')
    await fileInput.setInputFiles(exportPath)

    const submitButton = importModal.getByTestId('import-submit-button')
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    await expect(importModal.getByTestId('import-loading')).toBeVisible()

    const closeButton = importModal.getByTestId('import-close-button')
    await expect(closeButton).toBeVisible()
    await closeButton.click()
    await expect(importModal).not.toBeVisible()

    await expect(page.getByTestId('budget-month')).toHaveCount(2)

    const restoredYearElements = page.getByTestId('budget-year')
    const restoredFirstYear = restoredYearElements.first()
    const restoredYearAverageBalanceElement = restoredFirstYear.getByTestId('year-average-balance')
    const restoredAverageBalanceText = await restoredYearAverageBalanceElement.textContent()
    const restoredAverageBalance = parseInt(restoredAverageBalanceText?.replace(/[^-\d]/g, ''), 10)

    expect(restoredAverageBalance).toBe(originalAverageBalance)

    const fs = await import('fs/promises')
    await fs.unlink(exportPath).catch(() => {})
  })
})
