import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../helpers/wait-for-hydration'

const TEST_ENTRIES = [
  {
    description: 'Cash',
    amount: '5000',
    currency: 'USD',
  },
  {
    description: 'Bank card',
    amount: '12345',
    currency: 'INR',
  },
  {
    description: 'Second card',
    amount: '6789',
    currency: 'GEL',
  },
]

test.describe.serial('Budget page scenario testing', () => {
  test('should navigate from home to budget page', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    const budgetButton = page.getByTestId('go-to-budget-btn')
    await expect(budgetButton).toBeVisible()
    await budgetButton.click()

    await page.waitForURL('/budget')
    await waitForHydration(page)

    await expect(page).toHaveURL('/budget')
  })

  test('should show empty state when no months exist', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const timeline = page.getByTestId('budget-timeline')
    await expect(timeline).not.toBeVisible()

    const emptyState = page.getByTestId('budget-empty-state')
    await expect(emptyState).toBeVisible()

    const createFirstMonthButton = page.getByTestId('create-first-month-btn')
    await expect(createFirstMonthButton).toBeVisible()
  })

  test('should create first month when clicking create button', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const createFirstMonthButton = page.getByTestId('create-first-month-btn')
    await expect(createFirstMonthButton).toBeVisible()
    await createFirstMonthButton.click()

    const timeline = page.getByTestId('budget-timeline')
    await expect(timeline).toBeVisible()

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(1)
  })

  test('should add balance entries to budget through modal', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const balanceButton = page.getByTestId('balance-button').first()
    await expect(balanceButton).toBeVisible()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    for (const entry of TEST_ENTRIES) {
      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill(entry.description)

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill(entry.amount)

      const currencySelect = modal.getByTestId('currency-select')
      await currencySelect.click()
      await currencySelect.fill(entry.currency)
      await page.keyboard.press('Enter')

      const saveRowButton = modal.getByTestId('entry-save-button')
      await saveRowButton.click()
    }

    const tableRows = modal.locator('tbody tr')
    await expect(tableRows).toHaveCount(TEST_ENTRIES.length)

    for (let i = 0; i < TEST_ENTRIES.length; i++) {
      const row = tableRows.nth(i)
      await expect(row).toContainText(TEST_ENTRIES[i].description)
      const rowText = await row.textContent()
      expect(rowText).toContain(TEST_ENTRIES[i].description)
      expect(rowText?.replace(/\s/g, '')).toContain(TEST_ENTRIES[i].amount)
      expect(rowText).toContain(TEST_ENTRIES[i].currency)
    }

    const closeButton = page.getByTestId('modal-close-button')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })
})
