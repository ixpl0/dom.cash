import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../helpers/wait-for-hydration'

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
    await amountInput.fill('1000000')

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

      page.once('dialog', (dialog) => {
        expect(dialog.type()).toBe('confirm')
        dialog.accept()
      })

      await deleteButton.click()
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

    const currencyProfitLossButton = secondMonth.getByTestId('currency-profit-loss-button')
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
})
