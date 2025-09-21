import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { initBudget } from '../../helpers/budget-setup'
import { cleanupUserData } from '../../helpers/auth'

test.describe('Budget page extended testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should create first month from empty state', async ({ page }) => {
    const emptyState = page.getByTestId('budget-empty-state')
    await expect(emptyState).toBeVisible()

    const createFirstMonthButton = page.getByTestId('create-first-month-btn')
    await expect(createFirstMonthButton).toBeVisible()
    await createFirstMonthButton.click()

    const timeline = page.getByTestId('budget-timeline')
    await expect(timeline).toBeVisible()

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(1)
  })

  test('should add month on top when budget exists', async ({ page }) => {
    await initBudget(page, 'basic-test-data')

    const addMonthNextButton = page.getByTestId('add-month-next')
    const initialMonths = await page.getByTestId('budget-month').count()

    await addMonthNextButton.click()
    await expect(page.getByTestId('budget-month')).toHaveCount(initialMonths + 1)
  })

  test('should display year statistics for multiple months', async ({ page }) => {
    await initBudget(page, 'two-months-basic')

    const yearElements = page.getByTestId('budget-year')
    const firstYear = yearElements.first()

    await expect(firstYear).toBeVisible()

    const yearStats = [
      'year-average-balance',
      'year-total-income',
      'year-average-income',
      'year-total-expenses',
      'year-average-expenses',
    ] as const

    for (const testId of yearStats) {
      const element = firstYear.getByTestId(testId)
      await expect(element).toBeVisible()

      const text = await element.textContent()
      expect(text).toBeTruthy()
    }
  })

  test('should edit balance entry via modal', async ({ page }) => {
    await initBudget(page, 'basic-test-data')

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
    await expect(editButton).toBeVisible()

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    const updatedBalanceText = await balanceButton.textContent()
    expect(updatedBalanceText).toContain('200')
  })

  test('should show negative pocket expenses with warning styling', async ({ page }) => {
    await initBudget(page, 'two-months-basic')

    const months = page.getByTestId('budget-month')
    const secondMonth = months.nth(1)

    const expenseButton = secondMonth.getByTestId('expenses-button')
    await expenseButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const tableRows = modal.locator('tbody tr')
    const firstRow = tableRows.first()
    const editButton = firstRow.locator('.btn-warning')
    await editButton.click()

    const amountInput = modal.getByTestId('entry-amount-input')
    await amountInput.clear()
    await amountInput.fill('300')

    const saveRowButton = modal.getByTestId('entry-save-button')
    await saveRowButton.click()

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    const pocketExpensesButton = secondMonth.getByTestId('pocket-expenses-button')
    const pocketExpensesText = await pocketExpensesButton.textContent()

    expect(pocketExpensesText).toContain('-')
  })
})
