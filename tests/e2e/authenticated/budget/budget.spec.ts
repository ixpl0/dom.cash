import { test, expect } from '../../fixtures'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { acceptConfirmModal } from '../../helpers/confirmation'
import { initBudget } from '../../helpers/budget-setup'
import { cleanupUserData } from '../../helpers/auth'

test.describe('Budget page isolated tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should show empty state when no months exist', async ({ page }) => {
    const timeline = page.getByTestId('budget-timeline')
    await expect(timeline).not.toBeVisible()

    const emptyState = page.getByTestId('budget-empty-state')
    await expect(emptyState).toBeVisible()

    const createFirstMonthButton = page.getByTestId('create-first-month-btn')
    await expect(createFirstMonthButton).toBeVisible()
  })

  test('should show header with shared budgets button in empty state', async ({ page }) => {
    const emptyState = page.getByTestId('budget-empty-state')
    await expect(emptyState).toBeVisible()

    const header = page.getByTestId('budget-header')
    await expect(header).toBeVisible()

    const sharedBudgetsButton = page.getByTestId('shared-budgets-button')
    await expect(sharedBudgetsButton).toBeVisible()
  })

  test('should open shared budgets modal from empty state', async ({ page }) => {
    const emptyState = page.getByTestId('budget-empty-state')
    await expect(emptyState).toBeVisible()

    const sharedBudgetsButton = page.getByTestId('shared-budgets-button')
    await expect(sharedBudgetsButton).toBeVisible()
    await sharedBudgetsButton.click()

    const modal = page.getByTestId('shared-budgets-modal')
    await expect(modal).toBeVisible()

    const emptyModalState = page.getByTestId('shared-budgets-empty-state')
    await expect(emptyModalState).toBeVisible()
  })

  test('should create first month when clicking create button', async ({ page }) => {
    const createFirstMonthButton = page.getByTestId('create-first-month-btn')
    await expect(createFirstMonthButton).toBeVisible()
    await createFirstMonthButton.click()

    const timeline = page.getByTestId('budget-timeline')
    await expect(timeline).toBeVisible()

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(1)
  })

  test('should add balance entries to budget through modal', async ({ page }) => {
    await initBudget(page, 'one-month-empty')

    const balanceButton = page.getByTestId('balance-button').first()
    await expect(balanceButton).toBeVisible()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const balanceEntries = [
      { description: 'Cash', amount: '5000', currency: 'USD' },
      { description: 'Bank card', amount: '12345', currency: 'INR' },
      { description: 'Second card', amount: '6789', currency: 'GEL' },
    ]

    for (const entry of balanceEntries) {
      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill(entry.description)

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill(entry.amount)

      const currencySelect = modal.getByTestId('currency-picker')
      const currencySelectInput = currencySelect.getByTestId('currency-picker-input')
      await currencySelectInput.click()
      await currencySelectInput.fill(entry.currency)
      await currencySelect.getByTestId('currency-picker-dropdown-item')
        .filter({ hasText: new RegExp(`^${entry.currency}`) })
        .click()

      const saveRowButton = modal.getByTestId('entry-save-button')
      await saveRowButton.click()
    }

    const tableRows = modal.locator('tbody tr')
    await expect(tableRows).toHaveCount(balanceEntries.length)

    for (let i = 0; i < balanceEntries.length; i++) {
      const row = tableRows.nth(i)
      await expect(row).toContainText(balanceEntries[i].description)
      const rowText = await row.textContent()
      expect(rowText).toContain(balanceEntries[i].description)
      expect(rowText?.replace(/[\s,.']/g, '')).toContain(balanceEntries[i].amount)
    }

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should add income entries to budget through modal', async ({ page }) => {
    await initBudget(page, 'one-month-empty')

    const incomeButton = page.getByTestId('incomes-button').first()
    await expect(incomeButton).toBeVisible()
    await incomeButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const incomeEntries = [
      { description: 'Salary', amount: '3500', currency: 'JPY' },
      { description: 'Freelance', amount: '850', currency: 'CAD' },
    ]

    for (const entry of incomeEntries) {
      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill(entry.description)

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill(entry.amount)

      const currencySelect = modal.getByTestId('currency-picker')
      const currencySelectInput = currencySelect.getByTestId('currency-picker-input')
      await currencySelectInput.click()
      await currencySelectInput.fill(entry.currency)
      await currencySelect.getByTestId('currency-picker-dropdown-item')
        .filter({ hasText: new RegExp(`^${entry.currency}`) })
        .click()

      const saveRowButton = modal.getByTestId('entry-save-button')
      await saveRowButton.click()
    }

    const tableRows = modal.locator('tbody tr')
    await expect(tableRows).toHaveCount(incomeEntries.length)

    for (let i = 0; i < incomeEntries.length; i++) {
      const row = tableRows.nth(i)
      await expect(row).toContainText(incomeEntries[i].description)
      const rowText = await row.textContent()
      expect(rowText).toContain(incomeEntries[i].description)
      expect(rowText?.replace(/[\s,.']/g, '')).toContain(incomeEntries[i].amount)
    }

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should add expense entries to budget through modal', async ({ page }) => {
    await initBudget(page, 'one-month-empty')

    const expenseButton = page.getByTestId('expenses-button').first()
    await expect(expenseButton).toBeVisible()
    await expenseButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const expenseEntries = [
      { description: 'Rent', amount: '45000', currency: 'RUB' },
      { description: 'Groceries', amount: '320', currency: 'AUD' },
    ]

    for (const entry of expenseEntries) {
      const addButton = modal.getByTestId('add-entry-button')
      await addButton.click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill(entry.description)

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.fill(entry.amount)

      const currencySelect = modal.getByTestId('currency-picker')
      const currencySelectInput = currencySelect.getByTestId('currency-picker-input')
      await currencySelectInput.click()
      await currencySelectInput.fill(entry.currency)
      await currencySelect.getByTestId('currency-picker-dropdown-item')
        .filter({ hasText: new RegExp(`^${entry.currency}`) })
        .click()

      const saveRowButton = modal.getByTestId('entry-save-button')
      await saveRowButton.click()
    }

    const tableRows = modal.locator('tbody tr')
    await expect(tableRows).toHaveCount(expenseEntries.length)

    for (let i = 0; i < expenseEntries.length; i++) {
      const row = tableRows.nth(i)
      await expect(row).toContainText(expenseEntries[i].description)
      const rowText = await row.textContent()
      expect(rowText).toContain(expenseEntries[i].description)
      expect(rowText?.replace(/[\s,.']/g, '')).toContain(expenseEntries[i].amount)
    }

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should read exchange rates from modal', async ({ page }) => {
    await initBudget(page, 'one-month-with-data')

    const monthBadge = page.getByTestId('month-badge').first()
    await expect(monthBadge).toBeVisible()
    await monthBadge.click()

    const currencyRatesModal = page.getByTestId('currency-rates-modal')
    await expect(currencyRatesModal).toBeVisible()

    const currencies = ['USD', 'INR', 'GEL', 'EUR', 'JPY', 'CAD'] as const

    for (const currency of currencies) {
      const rateElement = currencyRatesModal.getByTestId(`rate-${currency}`)
      await expect(rateElement).toBeVisible()

      const rateText = await rateElement.textContent()
      const rate = parseFloat(rateText?.replace(/[^\d.]/g, ''))

      expect(rate).toBeGreaterThan(0)
    }

    const closeButton = currencyRatesModal.getByTestId('modal-close-button')
    await closeButton.click()
    await expect(currencyRatesModal).not.toBeVisible()
  })

  test('should filter and read currencies in currency rates modal', async ({ page }) => {
    await initBudget(page, 'one-month-with-data')

    const monthBadge = page.getByTestId('month-badge').first()
    await expect(monthBadge).toBeVisible()
    await monthBadge.click()

    const currencyRatesModal = page.getByTestId('currency-rates-modal')
    await expect(currencyRatesModal).toBeVisible()

    const searchInput = currencyRatesModal.getByTestId('currency-rates-search-input')
    await searchInput.fill('JPY')

    const rateElements = currencyRatesModal.locator('[data-testid^="rate-"]')
    await expect(rateElements).toHaveCount(1)

    await searchInput.clear()
    const countAfterClear = await rateElements.count()
    expect(countAfterClear).toBeGreaterThan(1)

    const additionalCurrencies = ['RUB', 'AUD'] as const

    for (const currency of additionalCurrencies) {
      await searchInput.fill(currency)

      const rateElement = currencyRatesModal.getByTestId(`rate-${currency}`)
      await expect(rateElement).toBeVisible()

      const rateText = await rateElement.textContent()
      const rate = parseFloat(rateText?.replace(/[^\d.]/g, ''))

      expect(rate).toBeGreaterThan(0)

      await searchInput.clear()
    }

    await page.keyboard.press('Escape')
    await expect(currencyRatesModal).not.toBeVisible()
  })

  test('should correctly calculate and display totals for balance, income and expenses in base currency', async ({ page }) => {
    await initBudget(page, 'one-month-with-data')

    const budgetHeader = page.getByTestId('budget-header')
    const currencySelect = budgetHeader.getByTestId('currency-picker-input')
    const baseCurrencyValue = await currencySelect.inputValue()
    const baseCurrency = baseCurrencyValue.split(' ')[0]

    expect(baseCurrency).toBe('USD')

    const balanceButton = page.getByTestId('balance-button').first()
    const incomesButton = page.getByTestId('incomes-button').first()
    const expensesButton = page.getByTestId('expenses-button').first()

    const balanceText = await balanceButton.textContent()
    const incomesText = await incomesButton.textContent()
    const expensesText = await expensesButton.textContent()

    const balanceTotal = parseInt(balanceText?.replace(/\D/g, ''), 10)
    const incomesTotal = parseInt(incomesText?.replace(/\D/g, ''), 10)
    const expensesTotal = parseInt(expensesText?.replace(/\D/g, ''), 10)

    expect(balanceTotal).toBeGreaterThan(0)
    expect(incomesTotal).toBeGreaterThan(0)
    expect(expensesTotal).toBeGreaterThan(0)
  })

  test('should recalculate all totals when changing base currency to EUR', async ({ page }) => {
    await initBudget(page, 'one-month-with-data')

    const budgetHeader = page.getByTestId('budget-header')

    const balanceButton = page.getByTestId('balance-button').first()
    const incomesButton = page.getByTestId('incomes-button').first()
    const expensesButton = page.getByTestId('expenses-button').first()

    const oldBalanceText = await balanceButton.textContent()
    const oldIncomesText = await incomesButton.textContent()
    const oldExpensesText = await expensesButton.textContent()

    const currencySelect = budgetHeader.getByTestId('currency-picker')
    const currencySelectInput = currencySelect.getByTestId('currency-picker-input')
    await currencySelectInput.click()
    await currencySelectInput.fill('EUR')
    await currencySelect.getByTestId('currency-picker-dropdown-item')
      .filter({ hasText: /^EUR/ })
      .click()

    await expect(currencySelectInput).toHaveValue(/^EUR/)

    await expect(balanceButton).not.toHaveText(oldBalanceText || '')
    await expect(incomesButton).not.toHaveText(oldIncomesText || '')
    await expect(expensesButton).not.toHaveText(oldExpensesText || '')

    const balanceText = await balanceButton.textContent()
    const incomesText = await incomesButton.textContent()
    const expensesText = await expensesButton.textContent()

    const balanceTotal = parseInt(balanceText?.replace(/\D/g, ''), 10)
    const incomesTotal = parseInt(incomesText?.replace(/\D/g, ''), 10)
    const expensesTotal = parseInt(expensesText?.replace(/\D/g, ''), 10)

    expect(balanceTotal).toBeGreaterThan(0)
    expect(incomesTotal).toBeGreaterThan(0)
    expect(expensesTotal).toBeGreaterThan(0)
  })

  test('should edit entries and persist changes after page reload', async ({ page }) => {
    await initBudget(page, 'one-month-with-data')

    const button = page.getByTestId('balance-button').first()

    const oldButtonText = await button.textContent()

    await button.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const tableRows = modal.locator('tbody tr')
    const targetRow = tableRows.nth(1)

    const editButton = targetRow.locator('.btn-warning')
    await editButton.click()

    const amountInput = modal.getByTestId('entry-amount-input')
    await amountInput.clear()
    await amountInput.fill('0')

    const saveButton = modal.getByTestId('entry-save-button')
    await saveButton.click()

    await expect(editButton).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()

    await expect(button).not.toHaveText(oldButtonText || '')

    const updatedButtonText = await button.textContent()
    const updatedTotal = parseInt(updatedButtonText?.replace(/\D/g, ''), 10)

    await page.reload()
    await waitForHydration(page)

    const buttonAfterReload = page.getByTestId('balance-button').first()
    const buttonTextAfterReload = await buttonAfterReload.textContent()
    const displayedTotal = parseInt(buttonTextAfterReload?.replace(/\D/g, ''), 10)

    expect(displayedTotal).toBe(updatedTotal)
  })

  test('should delete entries and persist changes after page reload', async ({ page }) => {
    await initBudget(page, 'one-month-with-data')

    const deleteOperations = [
      { testId: 'balance-button', entryIndex: 1 },
      { testId: 'incomes-button', entryIndex: 0 },
      { testId: 'expenses-button', entryIndex: 1 },
    ] as const

    const updatedTotals = []

    for (const operation of deleteOperations) {
      const button = page.getByTestId(operation.testId).first()

      const oldButtonText = await button.textContent()

      await button.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const tableRows = modal.locator('tbody tr')
      const targetRow = tableRows.nth(operation.entryIndex)

      const deleteButton = targetRow.locator('.btn-error')
      await deleteButton.click()
      await acceptConfirmModal(page)

      const closeButton = modal.getByTestId('modal-close-button')
      await closeButton.click()
      await expect(modal).not.toBeVisible()

      await expect(button).not.toHaveText(oldButtonText || '')

      const updatedButtonText = await button.textContent()
      const updatedTotal = parseInt(updatedButtonText?.replace(/\D/g, ''), 10)
      updatedTotals.push(updatedTotal)
    }

    await page.reload()
    await waitForHydration(page)

    for (let i = 0; i < deleteOperations.length; i++) {
      const operation = deleteOperations[i]
      const button = page.getByTestId(operation.testId).first()
      const buttonText = await button.textContent()
      const displayedTotal = parseInt(buttonText?.replace(/\D/g, ''), 10)

      expect(displayedTotal).toBe(updatedTotals[i])
    }
  })

  test('should display dashes for calculated fields when next month balance is missing', async ({ page }) => {
    await initBudget(page, 'one-month-with-data')

    const monthCard = page.getByTestId('budget-month').first()
    await expect(monthCard).toBeVisible()

    const pocketExpensesButton = monthCard.getByTestId('pocket-expenses-button')
    const totalExpensesButton = monthCard.getByTestId('total-expenses-button')
    const balanceChangeButton = monthCard.getByTestId('balance-change-button')
    const currencyFluctuationButton = monthCard.getByTestId('currency-fluctuation-button')

    await expect(pocketExpensesButton).toHaveText('—')
    await expect(totalExpensesButton).toHaveText('—')
    await expect(balanceChangeButton).toHaveText('—')
    await expect(currencyFluctuationButton).toHaveText('—')
  })

  test('should add month on top and copy only balance entries from previous month', async ({ page }) => {
    await initBudget(page, 'one-month-with-data')

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(1)

    const previousMonth = months.first()
    const previousMonthBalanceButton = previousMonth.getByTestId('balance-button')
    const previousMonthBalanceText = await previousMonthBalanceButton.textContent()
    const previousMonthBalanceTotal = parseInt(previousMonthBalanceText?.replace(/\D/g, ''), 10)

    const addMonthTopButton = page.getByTestId('add-month-next')
    await expect(addMonthTopButton).toBeVisible()
    await addMonthTopButton.click()

    await expect(months).toHaveCount(2)

    const newMonth = months.first()

    const newMonthBalanceButton = newMonth.getByTestId('balance-button')
    const newMonthIncomesButton = newMonth.getByTestId('incomes-button')
    const newMonthExpensesButton = newMonth.getByTestId('expenses-button')

    await expect(newMonthBalanceButton).toBeVisible()
    await expect(newMonthIncomesButton).toBeVisible()
    await expect(newMonthExpensesButton).toBeVisible()

    const newMonthBalanceText = await newMonthBalanceButton.textContent()
    const newMonthIncomesText = await newMonthIncomesButton.textContent()
    const newMonthExpensesText = await newMonthExpensesButton.textContent()

    const newMonthBalanceTotal = parseInt(newMonthBalanceText?.replace(/\D/g, ''), 10)
    const newMonthIncomesTotal = parseInt(newMonthIncomesText?.replace(/\D/g, ''), 10)
    const newMonthExpensesTotal = parseInt(newMonthExpensesText?.replace(/\D/g, ''), 10)

    expect(newMonthBalanceTotal).toBe(previousMonthBalanceTotal)
    expect(newMonthIncomesTotal).toBe(0)
    expect(newMonthExpensesTotal).toBe(0)
  })

  test('should delete month when confirm dialog is accepted', async ({ page }) => {
    await initBudget(page, 'two-months-with-data')

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(2)

    const deleteButtons = page.getByTestId('delete-month-button')

    const firstDeleteButton = deleteButtons.first()
    await firstDeleteButton.click()
    await acceptConfirmModal(page)

    await expect(months).toHaveCount(1)
  })

  test('should create 13 months timeline spanning multiple years', async ({ page }) => {
    await initBudget(page, 'one-month-with-data')

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(1)

    const addMonthPreviousButton = page.getByTestId('add-month-previous')

    for (let i = 0; i < 13; i++) {
      await addMonthPreviousButton.click()
      await expect(months).toHaveCount(i + 2)
    }

    const yearElements = page.getByTestId('budget-year')
    const yearCount = await yearElements.count()

    expect(yearCount).toBeGreaterThanOrEqual(2)
  })
})
