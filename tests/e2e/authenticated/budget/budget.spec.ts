import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { acceptConfirmModal } from '../../helpers/confirmation'

const BALANCE_ENTRIES = Object.freeze([
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
])

const INCOME_ENTRIES = Object.freeze([
  {
    description: 'Salary',
    amount: '3500',
    currency: 'JPY',
  },
  {
    description: 'Freelance',
    amount: '850',
    currency: 'CAD',
  },
])

const EXPENSE_ENTRIES = Object.freeze([
  {
    description: 'Rent',
    amount: '45000',
    currency: 'RUB',
  },
  {
    description: 'Groceries',
    amount: '320',
    currency: 'AUD',
  },
])

const exchangeRates = {
  USD: 0,
  INR: 0,
  GEL: 0,
  EUR: 0,
  JPY: 0,
  CAD: 0,
  RUB: 0,
  AUD: 0,
}

const calculateTotal = (entries: readonly { amount: string, currency: string }[], baseCurrency: string): number => {
  return entries.reduce((total, entry) => {
    const amount = Number(entry.amount)

    if (entry.currency === baseCurrency) {
      return total + amount
    }

    const fromRate = exchangeRates[entry.currency as keyof typeof exchangeRates]
    const toRate = exchangeRates[baseCurrency as keyof typeof exchangeRates]

    expect(fromRate).toBeGreaterThan(0)
    expect(toRate).toBeGreaterThan(0)

    const amountInBaseCurrency = (amount / fromRate) * toRate

    return total + amountInBaseCurrency
  }, 0)
}

const calculateTotalBalance = (baseCurrency: string): number => {
  return calculateTotal(BALANCE_ENTRIES, baseCurrency)
}

const calculateTotalIncome = (baseCurrency: string): number => {
  return calculateTotal(INCOME_ENTRIES, baseCurrency)
}

const calculateTotalExpenses = (baseCurrency: string): number => {
  return calculateTotal(EXPENSE_ENTRIES, baseCurrency)
}

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

    for (const entry of BALANCE_ENTRIES) {
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
    await expect(tableRows).toHaveCount(BALANCE_ENTRIES.length)

    for (let i = 0; i < BALANCE_ENTRIES.length; i++) {
      const row = tableRows.nth(i)
      await expect(row).toContainText(BALANCE_ENTRIES[i].description)
      const rowText = await row.textContent()
      expect(rowText).toContain(BALANCE_ENTRIES[i].description)
      expect(rowText?.replace(/\s/g, '')).toContain(BALANCE_ENTRIES[i].amount)
      expect(rowText).toContain(BALANCE_ENTRIES[i].currency)
    }

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should add income entries to budget through modal', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const incomeButton = page.getByTestId('incomes-button').first()
    await expect(incomeButton).toBeVisible()
    await incomeButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    for (const entry of INCOME_ENTRIES) {
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
    await expect(tableRows).toHaveCount(INCOME_ENTRIES.length)

    for (let i = 0; i < INCOME_ENTRIES.length; i++) {
      const row = tableRows.nth(i)
      await expect(row).toContainText(INCOME_ENTRIES[i].description)
      const rowText = await row.textContent()
      expect(rowText).toContain(INCOME_ENTRIES[i].description)
      expect(rowText?.replace(/\s/g, '')).toContain(INCOME_ENTRIES[i].amount)
      expect(rowText).toContain(INCOME_ENTRIES[i].currency)
    }

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should add expense entries to budget through modal', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const expenseButton = page.getByTestId('expenses-button').first()
    await expect(expenseButton).toBeVisible()
    await expenseButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    for (const entry of EXPENSE_ENTRIES) {
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
    await expect(tableRows).toHaveCount(EXPENSE_ENTRIES.length)

    for (let i = 0; i < EXPENSE_ENTRIES.length; i++) {
      const row = tableRows.nth(i)
      await expect(row).toContainText(EXPENSE_ENTRIES[i].description)
      const rowText = await row.textContent()
      expect(rowText).toContain(EXPENSE_ENTRIES[i].description)
      expect(rowText?.replace(/\s/g, '')).toContain(EXPENSE_ENTRIES[i].amount)
      expect(rowText).toContain(EXPENSE_ENTRIES[i].currency)
    }

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should read exchange rates from modal', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

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

      exchangeRates[currency] = rate
      expect(rate).toBeGreaterThan(0)
    }

    const closeButton = currencyRatesModal.getByTestId('modal-close-button')
    await closeButton.click()
    await expect(currencyRatesModal).not.toBeVisible()
  })

  test('should filter and read currencies in currency rates modal', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const monthBadge = page.getByTestId('month-badge').first()
    await expect(monthBadge).toBeVisible()
    await monthBadge.click()

    const currencyRatesModal = page.getByTestId('currency-rates-modal')
    await expect(currencyRatesModal).toBeVisible()

    const searchInput = currencyRatesModal.getByPlaceholder('Поиск валюты по коду или названию...')
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

      exchangeRates[currency] = rate
      expect(rate).toBeGreaterThan(0)

      await searchInput.clear()
    }

    await page.keyboard.press('Escape')
    await expect(currencyRatesModal).not.toBeVisible()
  })

  test('should correctly calculate and display totals for balance, income and expenses in base currency', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const budgetHeader = page.getByTestId('budget-header')
    const currencySelect = budgetHeader.getByTestId('currency-select')
    const baseCurrencyValue = await currencySelect.inputValue()
    const baseCurrency = baseCurrencyValue.split(' ')[0]

    expect(baseCurrency).toBe('USD')

    const budgetTypes = [
      { testId: 'balance-button', calculate: calculateTotalBalance, name: 'balance' },
      { testId: 'incomes-button', calculate: calculateTotalIncome, name: 'income' },
      { testId: 'expenses-button', calculate: calculateTotalExpenses, name: 'expenses' },
    ] as const

    for (const budgetType of budgetTypes) {
      const expected = Math.round(budgetType.calculate(baseCurrency))

      const button = page.getByTestId(budgetType.testId).first()
      const buttonText = await button.textContent()
      const displayed = parseInt(buttonText?.replace(/[^\d]/g, ''), 10)

      expect(displayed).toBe(expected)
    }
  })

  test('should recalculate all totals when changing base currency to EUR', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const budgetHeader = page.getByTestId('budget-header')
    const currencySelect = budgetHeader.getByTestId('currency-select')

    await currencySelect.click()
    await currencySelect.fill('EUR')
    await page.keyboard.press('Enter')

    await page.waitForTimeout(500)

    const baseCurrencyValue = await currencySelect.inputValue()
    const baseCurrency = baseCurrencyValue.split(' ')[0]

    expect(baseCurrency).toBe('EUR')

    const budgetTypes = [
      { testId: 'balance-button', calculate: calculateTotalBalance, name: 'balance' },
      { testId: 'incomes-button', calculate: calculateTotalIncome, name: 'income' },
      { testId: 'expenses-button', calculate: calculateTotalExpenses, name: 'expenses' },
    ] as const

    for (const budgetType of budgetTypes) {
      const expected = Math.round(budgetType.calculate(baseCurrency))

      const button = page.getByTestId(budgetType.testId).first()
      const buttonText = await button.textContent()
      const displayed = parseInt(buttonText?.replace(/[^\d]/g, ''), 10)

      expect(displayed).toBe(expected)
    }
  })

  test('should edit entries and persist changes after page reload', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const editOperations = [
      { testId: 'balance-button', entryIndex: 1, newAmount: '0', entries: BALANCE_ENTRIES },
      { testId: 'incomes-button', entryIndex: 0, newAmount: '0', entries: INCOME_ENTRIES },
      { testId: 'expenses-button', entryIndex: 1, newAmount: '0', entries: EXPENSE_ENTRIES },
    ] as const

    const updatedTotals = []

    for (const operation of editOperations) {
      const button = page.getByTestId(operation.testId).first()
      await button.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const tableRows = modal.locator('tbody tr')
      const targetRow = tableRows.nth(operation.entryIndex)

      const editButton = targetRow.locator('.btn-warning')
      await editButton.click()

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.clear()
      await amountInput.fill(operation.newAmount)

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const closeButton = modal.getByTestId('modal-close-button')
      await closeButton.click()
      await expect(modal).not.toBeVisible()

      const updatedButtonText = await button.textContent()
      const updatedTotal = parseInt(updatedButtonText?.replace(/[^\d]/g, ''), 10)
      updatedTotals.push(updatedTotal)
    }

    await page.reload()
    await waitForHydration(page)

    for (let i = 0; i < editOperations.length; i++) {
      const operation = editOperations[i]
      const button = page.getByTestId(operation.testId).first()
      const buttonText = await button.textContent()
      const displayedTotal = parseInt(buttonText?.replace(/[^\d]/g, ''), 10)

      expect(displayedTotal).toBe(updatedTotals[i])
    }

    for (const operation of editOperations) {
      const button = page.getByTestId(operation.testId).first()
      await button.click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      const tableRows = modal.locator('tbody tr')
      const targetRow = tableRows.nth(operation.entryIndex)

      const editButton = targetRow.locator('.btn-warning')
      await editButton.click()

      const amountInput = modal.getByTestId('entry-amount-input')
      await amountInput.clear()
      await amountInput.fill(operation.entries[operation.entryIndex].amount)

      const saveButton = modal.getByTestId('entry-save-button')
      await saveButton.click()

      const closeButton = modal.getByTestId('modal-close-button')
      await closeButton.click()
      await expect(modal).not.toBeVisible()
    }
  })

  test('should delete entries and persist changes after page reload', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const deleteOperations = [
      { testId: 'balance-button', entryIndex: 1, entries: BALANCE_ENTRIES },
      { testId: 'incomes-button', entryIndex: 0, entries: INCOME_ENTRIES },
      { testId: 'expenses-button', entryIndex: 1, entries: EXPENSE_ENTRIES },
    ] as const

    const updatedTotals = []

    for (const operation of deleteOperations) {
      const button = page.getByTestId(operation.testId).first()
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

      const updatedButtonText = await button.textContent()
      const updatedTotal = parseInt(updatedButtonText?.replace(/[^\d]/g, ''), 10)
      updatedTotals.push(updatedTotal)
    }

    await page.reload()
    await waitForHydration(page)

    for (let i = 0; i < deleteOperations.length; i++) {
      const operation = deleteOperations[i]
      const button = page.getByTestId(operation.testId).first()
      const buttonText = await button.textContent()
      const displayedTotal = parseInt(buttonText?.replace(/[^\d]/g, ''), 10)

      expect(displayedTotal).toBe(updatedTotals[i])
    }
  })

  test('should display dashes for calculated fields when next month balance is missing', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

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
    await page.goto('/budget')
    await waitForHydration(page)

    const addMonthTopButton = page.getByTestId('add-month-next')
    await expect(addMonthTopButton).toBeVisible()
    await addMonthTopButton.click()

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(2)

    const newMonth = months.first()
    const previousMonth = months.nth(1)

    const newMonthBalanceButton = newMonth.getByTestId('balance-button')
    const previousMonthBalanceButton = previousMonth.getByTestId('balance-button')
    const newMonthIncomesButton = newMonth.getByTestId('incomes-button')
    const newMonthExpensesButton = newMonth.getByTestId('expenses-button')

    const newMonthBalanceText = await newMonthBalanceButton.textContent()
    const previousMonthBalanceText = await previousMonthBalanceButton.textContent()
    const newMonthIncomesText = await newMonthIncomesButton.textContent()
    const newMonthExpensesText = await newMonthExpensesButton.textContent()

    const newMonthBalanceTotal = parseInt(newMonthBalanceText?.replace(/[^\d]/g, ''), 10)
    const previousMonthBalanceTotal = parseInt(previousMonthBalanceText?.replace(/[^\d]/g, ''), 10)
    const newMonthIncomesTotal = parseInt(newMonthIncomesText?.replace(/[^\d]/g, ''), 10)
    const newMonthExpensesTotal = parseInt(newMonthExpensesText?.replace(/[^\d]/g, ''), 10)

    expect(newMonthBalanceTotal).toBe(previousMonthBalanceTotal)
    expect(newMonthIncomesTotal).toBe(0)
    expect(newMonthExpensesTotal).toBe(0)
  })

  test('should delete month when confirm dialog is accepted', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(2)

    const deleteButtons = page.getByTestId('delete-month-button')
    await expect(deleteButtons).toHaveCount(2)

    const firstDeleteButton = deleteButtons.first()
    await firstDeleteButton.click()
    await acceptConfirmModal(page)

    await expect(months).toHaveCount(1)
  })

  test('should create 13 months timeline spanning multiple years', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const addMonthPreviousButton = page.getByTestId('add-month-previous')

    for (let i = 0; i < 13; i++) {
      await addMonthPreviousButton.click()
      await expect(page.getByTestId('budget-month')).toHaveCount(i + 2)
    }

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(14)

    const yearElements = page.getByTestId('budget-year')
    const yearCount = await yearElements.count()

    expect(yearCount).toBeGreaterThanOrEqual(2)
  })
})
