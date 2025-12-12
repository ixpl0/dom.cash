import { test, expect } from '../../../fixtures'
import { waitForHydration } from '../../../helpers/wait-for-hydration'
import { initBudget } from '../../../helpers/budget-setup'
import { cleanupUserData } from '../../../helpers/auth'

test.describe('Entry Modal functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test.describe('Form validation', () => {
    test('should show error toast when trying to save entry with empty description', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('100')

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const toast = page.getByTestId('toast-error')
      await expect(toast).toBeVisible()
    })

    test('should show error toast when trying to save entry with empty amount', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Test Entry')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.clear()

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const toast = page.getByTestId('toast-error')
      await expect(toast).toBeVisible()
    })

    test('should show error for negative amount in balance entry', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Negative Balance')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('-100')

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const toast = page.getByTestId('toast-error')
      await expect(toast).toBeVisible()
    })

    test('should show error for zero amount in income entry', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const incomeButton = page.getByTestId('incomes-button').first()
      await incomeButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Zero Income')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('0')

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const toast = page.getByTestId('toast-error')
      await expect(toast).toBeVisible()
    })

    test('should show error for negative amount in expense entry', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const expenseButton = page.getByTestId('expenses-button').first()
      await expenseButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Negative Expense')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('-50')

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const toast = page.getByTestId('toast-error')
      await expect(toast).toBeVisible()
    })

    test('should allow zero amount for balance entry', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Zero Balance')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('0')

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(1)
      await expect(entryRows.first()).toContainText('Zero Balance')
    })

    test('should successfully save valid entry', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Valid Entry')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('500')

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(1)
      await expect(entryRows.first()).toContainText('Valid Entry')
    })
  })

  test.describe('Optional checkbox for expenses', () => {
    test('should show optional checkbox only for expense entries', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const optionalCheckbox = modal.getByTestId('entry-optional-checkbox')
      await expect(optionalCheckbox).not.toBeVisible()

      await modal.getByTestId('entry-cancel-button').click()
      await modal.getByTestId('modal-close-button').click()

      const incomeButton = page.getByTestId('incomes-button').first()
      await incomeButton.click()
      await expect(modal).toBeVisible()

      await modal.getByTestId('add-entry-button').click()
      await expect(optionalCheckbox).not.toBeVisible()

      await modal.getByTestId('entry-cancel-button').click()
      await modal.getByTestId('modal-close-button').click()

      const expenseButton = page.getByTestId('expenses-button').first()
      await expenseButton.click()
      await expect(modal).toBeVisible()

      await modal.getByTestId('add-entry-button').click()
      await expect(optionalCheckbox).toBeVisible()
    })

    test('should save expense with optional checkbox checked', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const expenseButton = page.getByTestId('expenses-button').first()
      await expenseButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Optional Expense')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('100')

      const optionalCheckbox = modal.getByTestId('entry-optional-checkbox')
      await optionalCheckbox.check()
      await expect(optionalCheckbox).toBeChecked()

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(1)

      const checkIcon = entryRows.first().locator('svg.text-success')
      await expect(checkIcon).toBeVisible()
    })

    test('should save expense with optional checkbox unchecked', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const expenseButton = page.getByTestId('expenses-button').first()
      await expenseButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Required Expense')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('200')

      const optionalCheckbox = modal.getByTestId('entry-optional-checkbox')
      await expect(optionalCheckbox).not.toBeChecked()

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(1)

      const checkIcon = entryRows.first().locator('svg.text-success')
      await expect(checkIcon).not.toBeVisible()
    })

    test('should persist optional status after page reload', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const expenseButton = page.getByTestId('expenses-button').first()
      await expenseButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Persisted Optional')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('150')

      const optionalCheckbox = modal.getByTestId('entry-optional-checkbox')
      await optionalCheckbox.check()

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(1)

      await modal.getByTestId('modal-close-button').click()

      await page.reload()
      await waitForHydration(page)

      const expenseButtonAfterReload = page.getByTestId('expenses-button').first()
      await expenseButtonAfterReload.click()

      const modalAfterReload = page.getByTestId('entry-modal')
      await expect(modalAfterReload).toBeVisible()

      const entryRowsAfterReload = modalAfterReload.getByTestId('entry-row')
      await expect(entryRowsAfterReload).toHaveCount(1)

      const checkIcon = entryRowsAfterReload.first().locator('svg.text-success')
      await expect(checkIcon).toBeVisible()
    })
  })

  test.describe('Multi-currency entries', () => {
    test('should create entries with different currencies', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const currencies = ['USD', 'EUR', 'GBP']

      for (const currency of currencies) {
        const addButton = modal.getByTestId('add-entry-button')
        await addButton.click()

        const descriptionInput = modal.getByTestId('entry-description-input')
        await descriptionInput.fill(`Balance in ${currency}`)

        const amountInput = modal.getByTestId('entry-amount-input')
        await amountInput.fill('1000')

        const currencyPicker = modal.getByTestId('currency-picker')
        const currencyInput = currencyPicker.getByTestId('currency-picker-input')
        await currencyInput.click()
        await currencyInput.fill(currency)
        await currencyPicker.getByTestId('currency-picker-dropdown-item')
          .filter({ hasText: new RegExp(`^${currency}`) })
          .click()

        const saveButton = modal.getByTestId('entry-save-button')
        await saveButton.click()

        await expect(modal.getByTestId('entry-row')).toHaveCount(currencies.indexOf(currency) + 1)
      }

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(3)

      for (let i = 0; i < currencies.length; i++) {
        const row = entryRows.nth(i)
        await expect(row).toContainText(currencies[i])
      }
    })

    test('should display currency conversion tooltip', async ({ page }) => {
      await initBudget(page, 'one-month-with-data')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const entryRows = modal.getByTestId('entry-row')
      const rowCount = await entryRows.count()

      let foundTooltip = false
      for (let i = 0; i < rowCount; i++) {
        const row = entryRows.nth(i)
        const tooltip = row.locator('.tooltip')
        if (await tooltip.count() > 0) {
          foundTooltip = true
          const dataTip = await tooltip.getAttribute('data-tip')
          expect(dataTip).toBeTruthy()
          break
        }
      }

      expect(foundTooltip).toBe(true)
    })

    test('should preserve currency after editing entry', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('EUR Entry')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('500')

      const currencyPicker = modal.getByTestId('currency-picker')
      const currencyInput = currencyPicker.getByTestId('currency-picker-input')
      await currencyInput.click()
      await currencyInput.fill('EUR')
      await currencyPicker.getByTestId('currency-picker-dropdown-item')
        .filter({ hasText: /^EUR/ })
        .click()

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(1)
      await expect(entryRows.first()).toContainText('EUR')

      const editButton = entryRows.first().getByTestId('entry-edit-button')
      await editButton.click()

      const editAmountInput = modal.getByTestId('entry-amount-input')
      await editAmountInput.clear()
      await editAmountInput.fill('750')

      const editSaveButton = modal.getByTestId('entry-save-button')
      await editSaveButton.click()

      await expect(entryRows.first()).toContainText('EUR')
      await expect(entryRows.first()).toContainText('750')
    })

    test('should change currency during edit', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Currency Change Test')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('1000')

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(1)

      const editButton = entryRows.first().getByTestId('entry-edit-button')
      await editButton.click()

      const currencyPicker = modal.getByTestId('currency-picker')
      const currencyInput = currencyPicker.getByTestId('currency-picker-input')
      await currencyInput.click()
      await currencyInput.fill('JPY')
      await currencyPicker.getByTestId('currency-picker-dropdown-item')
        .filter({ hasText: /^JPY/ })
        .click()

      const editSaveButton = modal.getByTestId('entry-save-button')
      await editSaveButton.click()

      await expect(entryRows.first()).toContainText('JPY')
    })
  })

  test.describe('Entry modal keyboard interactions', () => {
    test('should save entry on Enter key press', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Enter Key Test')

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill('100')

      await amountInput.press('Enter')

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(1)
      await expect(entryRows.first()).toContainText('Enter Key Test')
    })

    test('should cancel entry editing on Escape key press', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Escape Key Test')

      await descriptionInput.press('Escape')

      const editRow = modal.getByTestId('entry-description-input')
      await expect(editRow).not.toBeVisible()

      const entryRows = modal.getByTestId('entry-row')
      await expect(entryRows).toHaveCount(0)
    })
  })

  test.describe('Date field for income and expense entries', () => {
    test('should show date field for income entries', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const incomeButton = page.getByTestId('incomes-button').first()
      await incomeButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const dateInput = modal.locator('input[type="date"]')
      await expect(dateInput).toBeVisible()
    })

    test('should show date field for expense entries', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const expenseButton = page.getByTestId('expenses-button').first()
      await expenseButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const dateInput = modal.locator('input[type="date"]')
      await expect(dateInput).toBeVisible()
    })

    test('should not show date field for balance entries', async ({ page }) => {
      await initBudget(page, 'one-month-empty')

      const balanceButton = page.getByTestId('balance-button').first()
      await balanceButton.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const dateInput = modal.locator('input[type="date"]')
      await expect(dateInput).not.toBeVisible()
    })
  })
})
