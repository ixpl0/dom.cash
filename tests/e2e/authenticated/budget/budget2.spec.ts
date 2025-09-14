import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../helpers/wait-for-hydration'

const balanceInitialAmount = 100
const incomeInitialAmount = 200
const expenseInitialAmount = 50

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
      await amountInput.fill(incomeInitialAmount.toString())

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
      await amountInput.fill(expenseInitialAmount.toString())
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
      { testId: 'year-average-balance', expectedValue: balanceInitialAmount },
      { testId: 'year-total-income', expectedValue: incomeInitialAmount },
      { testId: 'year-average-income', expectedValue: incomeInitialAmount / 2 },
      { testId: 'year-total-expenses', expectedValue: expenseInitialAmount },
      { testId: 'year-average-expenses', expectedValue: expenseInitialAmount / 2 },
      { testId: 'year-total-pocket-expenses', expectedValue: incomeInitialAmount - expenseInitialAmount },
      { testId: 'year-average-pocket-expenses', expectedValue: incomeInitialAmount - expenseInitialAmount },
      { testId: 'year-total-all-expenses', expectedValue: expenseInitialAmount + (incomeInitialAmount - expenseInitialAmount) },
      { testId: 'year-average-all-expenses', expectedValue: expenseInitialAmount + (incomeInitialAmount - expenseInitialAmount) },
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
})
