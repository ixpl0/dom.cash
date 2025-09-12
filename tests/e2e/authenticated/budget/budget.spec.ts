import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../helpers/wait-for-hydration'

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

const exchangeRates = {
  USD: 0,
  INR: 0,
  GEL: 0,
  EUR: 0,
}

const calculateTotalBalance = (baseCurrency: string): number => {
  return BALANCE_ENTRIES.reduce((total, entry) => {
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

  test('should read exchange rates from modal', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const monthBadge = page.getByTestId('month-badge').first()
    await expect(monthBadge).toBeVisible()
    await monthBadge.click()

    const currencyRatesModal = page.getByTestId('currency-rates-modal')
    await expect(currencyRatesModal).toBeVisible()

    const usdRateElement = currencyRatesModal.getByTestId('rate-USD')
    const inrRateElement = currencyRatesModal.getByTestId('rate-INR')
    const gelRateElement = currencyRatesModal.getByTestId('rate-GEL')
    const eurRateElement = currencyRatesModal.getByTestId('rate-EUR')

    await expect(usdRateElement).toBeVisible()
    await expect(inrRateElement).toBeVisible()
    await expect(gelRateElement).toBeVisible()
    await expect(eurRateElement).toBeVisible()

    const usdRateText = await usdRateElement.textContent()
    const inrRateText = await inrRateElement.textContent()
    const gelRateText = await gelRateElement.textContent()
    const eurRateText = await eurRateElement.textContent()

    exchangeRates.USD = parseFloat(usdRateText?.replace(/[^\d.]/g, ''))
    exchangeRates.INR = parseFloat(inrRateText?.replace(/[^\d.]/g, ''))
    exchangeRates.GEL = parseFloat(gelRateText?.replace(/[^\d.]/g, ''))
    exchangeRates.EUR = parseFloat(eurRateText?.replace(/[^\d.]/g, ''))

    expect(exchangeRates.USD).toBeGreaterThan(0)
    expect(exchangeRates.INR).toBeGreaterThan(0)
    expect(exchangeRates.GEL).toBeGreaterThan(0)
    expect(exchangeRates.EUR).toBeGreaterThan(0)

    const closeButton = currencyRatesModal.getByTestId('modal-close-button')
    await closeButton.click()
    await expect(currencyRatesModal).not.toBeVisible()
  })

  test('should correctly calculate and display total balance in base currency', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    const budgetHeader = page.getByTestId('budget-header')
    const currencySelect = budgetHeader.getByTestId('currency-select')
    const baseCurrencyValue = await currencySelect.inputValue()
    const baseCurrency = baseCurrencyValue.split(' ')[0]

    const expectedTotal = Math.round(calculateTotalBalance(baseCurrency))

    const balanceButton = page.getByTestId('balance-button').first()
    const balanceButtonText = await balanceButton.textContent()
    const displayedTotal = parseInt(balanceButtonText?.replace(/[^\d]/g, ''), 10)

    expect(displayedTotal).toBe(expectedTotal)
  })

  test('should recalculate balance when changing base currency to EUR', async ({ page }) => {
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

    const expectedTotal = Math.round(calculateTotalBalance(baseCurrency))

    const balanceButton = page.getByTestId('balance-button').first()
    const balanceButtonText = await balanceButton.textContent()
    const displayedTotal = parseInt(balanceButtonText?.replace(/[^\d]/g, ''), 10)

    expect(displayedTotal).toBe(expectedTotal)
  })
})
