import { test, expect } from '../../fixtures'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { acceptConfirmModal } from '../../helpers/confirmation'
import { initBudget } from '../../helpers/budget-setup'
import { cleanupUserData } from '../../helpers/auth'

test.describe('Budget page historical testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should add previous month and manage year setup', async ({ page }) => {
    await initBudget(page, 'clp-currency')
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
    expect(finalYearCount).toBeGreaterThanOrEqual(1)

    const finalMonthsCount = await page.getByTestId('budget-month').count()
    expect(finalMonthsCount).toBe(2)
  })

  test('should display currency fluctuations in month and year stats', async ({ page }) => {
    await initBudget(page, 'two-months-clp')
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

    expect(monthCurrencyText).toBeTruthy()
    expect(yearTotalCurrencyText).toBeTruthy()
    expect(yearAverageCurrencyText).toBeTruthy()
  })

  test('should open chart modal with canvas and close it', async ({ page }) => {
    await initBudget(page, 'two-months-clp')
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

  test('should export budget data as JSON file', async ({ page }, testInfo) => {
    await initBudget(page, 'two-months-clp')
    await waitForHydration(page)

    const downloadPromise = page.waitForEvent('download')

    const exportButton = page.getByTestId('export-button')
    await expect(exportButton).toBeVisible()
    await exportButton.click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/budget.*\.json$/)

    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const savedPath = testInfo.outputPath('test-export.json')
    await download.saveAs(savedPath)

    const fs = await import('fs/promises')
    const fileContent = await fs.readFile(savedPath, 'utf-8')
    const exportedData = JSON.parse(fileContent)

    expect(exportedData).toHaveProperty('user')
    expect(exportedData).toHaveProperty('months')
    expect(exportedData.months).toHaveLength(2)

    await fs.unlink(savedPath).catch(() => {})
  })

  test('should import budget data and restore months', async ({ page }, testInfo) => {
    await initBudget(page, 'two-months-clp')

    const yearElements = page.getByTestId('budget-year')
    const firstYear = yearElements.first()
    const yearAverageBalanceElement = firstYear.getByTestId('year-average-balance')
    const originalAverageBalanceText = await yearAverageBalanceElement.textContent()
    const originalAverageBalance = parseInt(originalAverageBalanceText?.replace(/[^-\d]/g, ''), 10)

    const downloadPromise = page.waitForEvent('download')
    const exportButton = page.getByTestId('export-button')
    await exportButton.click()
    const download = await downloadPromise
    const exportPath = testInfo.outputPath('budget-for-import.json')
    await download.saveAs(exportPath)

    while (true) {
      const months = page.getByTestId('budget-month')
      const monthsCount = await months.count()

      if (monthsCount === 0) {
        break
      }

      const firstMonth = months.first()
      const deleteButton = firstMonth.getByTestId('delete-month-button')
      await deleteButton.click()
      await acceptConfirmModal(page)

      await expect(months).toHaveCount(monthsCount - 1)
    }

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
