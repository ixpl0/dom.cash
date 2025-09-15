import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../helpers/wait-for-hydration'

test.describe.serial('Budget page extended testing', () => {
  test('should create first month and add test data', async ({ page }) => {
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
    await descriptionInput.fill('Test Balance')

    const amountInput = modal.getByTestId('entry-amount-input')
    await amountInput.fill('100')

    const currencySelect = modal.getByTestId('currency-select')
    await currencySelect.click()
    await currencySelect.fill('USD')
    await page.keyboard.press('Enter')

    const saveRowButton = modal.getByTestId('entry-save-button')
    await saveRowButton.click()

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()
    await expect(modal).not.toBeVisible()

    const incomeButton = page.getByTestId('incomes-button').first()
    await incomeButton.click()

    await expect(modal).toBeVisible()

    await addButton.click()
    await descriptionInput.fill('Test Income')
    await amountInput.fill('200')
    await currencySelect.click()
    await currencySelect.fill('USD')
    await page.keyboard.press('Enter')
    await saveRowButton.click()
    await closeButton.click()
    await expect(modal).not.toBeVisible()

    const expenseButton = page.getByTestId('expenses-button').first()
    await expenseButton.click()

    await expect(modal).toBeVisible()

    await addButton.click()
    await descriptionInput.fill('Test Expense')
    await amountInput.fill('50')
    await currencySelect.click()
    await currencySelect.fill('USD')
    await page.keyboard.press('Enter')
    await saveRowButton.click()
    await closeButton.click()
    await expect(modal).not.toBeVisible()
  })

  test('should add month on top and ensure same year or add more data', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const addMonthNextButton = page.getByTestId('add-month-next')

    await addMonthNextButton.click()
    await expect(page.getByTestId('budget-month')).toHaveCount(2)

    const yearElements = page.getByTestId('budget-year')
    const yearCount = await yearElements.count()

    if (yearCount > 1) {
      await addMonthNextButton.click()
      await expect(page.getByTestId('budget-month')).toHaveCount(3)

      const incomeButton = page.getByTestId('incomes-button').nth(1)
      await incomeButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Test Income 2')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('200')

      const currencySelect = modal.getByTestId('currency-select')
      await currencySelect.click()
      await currencySelect.fill('USD')
      await page.keyboard.press('Enter')

      const saveRowButton = modal.getByTestId('entry-save-button')
      await saveRowButton.click()

      const closeButton = modal.getByTestId('modal-close-button')
      await closeButton.click()
      await expect(modal).not.toBeVisible()

      const expenseButton = page.getByTestId('expenses-button').nth(1)
      await expenseButton.click()

      await expect(modal).toBeVisible()

      await addButton.click()
      await descriptionInput.fill('Test Expense 2')
      await amountInput.fill('50')
      await currencySelect.click()
      await currencySelect.fill('USD')
      await page.keyboard.press('Enter')
      await saveRowButton.click()
      await closeButton.click()
      await expect(modal).not.toBeVisible()
    }
  })

  test('should correctly calculate and display year statistics for first year with multiple months', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const yearElements = page.getByTestId('budget-year')
    const firstYear = yearElements.first()

    await expect(firstYear).toBeVisible()

    const yearStats = [
      { testId: 'year-average-balance', expectedValue: 100 },
      { testId: 'year-total-income', expectedValue: 200 },
      { testId: 'year-average-income', expectedValue: 100 },
      { testId: 'year-total-expenses', expectedValue: 50 },
      { testId: 'year-average-expenses', expectedValue: 25 },
      { testId: 'year-total-pocket-expenses', expectedValue: 150 },
      { testId: 'year-average-pocket-expenses', expectedValue: 150 },
      { testId: 'year-total-all-expenses', expectedValue: 200 },
      { testId: 'year-average-all-expenses', expectedValue: 200 },
      { testId: 'year-total-balance-change', expectedValue: 0 },
      { testId: 'year-average-balance-change', expectedValue: 0 },
      { testId: 'year-total-currency-profit-loss', expectedValue: 0 },
      { testId: 'year-average-currency-profit-loss', expectedValue: 0 },
      { testId: 'year-total-optional-expenses', expectedValue: 0 },
      { testId: 'year-average-optional-expenses', expectedValue: 0 },
    ] as const

    for (const stat of yearStats) {
      const element = firstYear.getByTestId(stat.testId)
      await expect(element).toBeVisible()

      const text = await element.textContent()
      const displayedValue = parseInt(text?.replace(/[^\d]/g, ''), 10)
      expect(displayedValue).toBe(stat.expectedValue)
    }
  })

  test('should update data in first month and recalculate year statistics', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const months = page.getByTestId('budget-month')
    const firstMonth = months.first()

    const balanceButton = firstMonth.getByTestId('balance-button')
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const tableRows = modal.locator('tbody tr')
    const firstRow = tableRows.first()
    const editButton = firstRow.locator('.btn-warning')
    await editButton.click()

    const amountInput = modal.getByTestId('entry-amount-input')
    await amountInput.clear()
    await amountInput.fill('200')

    const saveRowButton = modal.getByTestId('entry-save-button')
    await saveRowButton.click()

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()
    await expect(modal).not.toBeVisible()

    const incomeButton = firstMonth.getByTestId('incomes-button')
    await incomeButton.click()

    await expect(modal).toBeVisible()

    const addButton = modal.getByTestId('add-entry-button')
    await addButton.click()

    const descriptionInput = modal.getByTestId('entry-description-input')
    await descriptionInput.fill('Additional Income')

    await amountInput.fill('10')

    const currencySelect = modal.getByTestId('currency-select')
    await currencySelect.click()
    await currencySelect.fill('USD')
    await page.keyboard.press('Enter')

    await saveRowButton.click()
    await closeButton.click()
    await expect(modal).not.toBeVisible()

    const expenseButton = firstMonth.getByTestId('expenses-button')
    await expenseButton.click()

    await expect(modal).toBeVisible()

    await addButton.click()
    await descriptionInput.fill('Optional Expense')
    await amountInput.fill('20')
    await currencySelect.click()
    await currencySelect.fill('USD')
    await page.keyboard.press('Enter')

    const optionalCheckbox = modal.getByTestId('entry-optional-checkbox')
    await optionalCheckbox.check()

    await saveRowButton.click()
    await closeButton.click()
    await expect(modal).not.toBeVisible()

    const yearElements = page.getByTestId('budget-year')
    const firstYear = yearElements.first()

    await expect(firstYear).toBeVisible()

    const yearStats = [
      { testId: 'year-average-balance', expectedValue: 150 },
      { testId: 'year-total-income', expectedValue: 210 },
      { testId: 'year-average-income', expectedValue: 105 },
      { testId: 'year-total-expenses', expectedValue: 70 },
      { testId: 'year-average-expenses', expectedValue: 35 },
      { testId: 'year-total-pocket-expenses', expectedValue: 50 },
      { testId: 'year-average-pocket-expenses', expectedValue: 50 },
      { testId: 'year-total-all-expenses', expectedValue: 100 },
      { testId: 'year-average-all-expenses', expectedValue: 100 },
      { testId: 'year-total-balance-change', expectedValue: 100 },
      { testId: 'year-average-balance-change', expectedValue: 100 },
      { testId: 'year-total-currency-profit-loss', expectedValue: 0 },
      { testId: 'year-average-currency-profit-loss', expectedValue: 0 },
      { testId: 'year-total-optional-expenses', expectedValue: 20 },
      { testId: 'year-average-optional-expenses', expectedValue: 10 },
    ] as const

    for (const stat of yearStats) {
      const element = firstYear.getByTestId(stat.testId)
      await expect(element).toBeVisible()

      const text = await element.textContent()
      const displayedValue = parseInt(text?.replace(/[^\d]/g, ''), 10)
      expect(displayedValue).toBe(stat.expectedValue)
    }
  })
})
