import { test, expect } from '../../fixtures'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { initBudget } from '../../helpers/budget-setup'
import { cleanupUserData } from '../../helpers/auth'

const PLAN_YEAR = 2099
const PLAN_MONTH = 9
const PLAN_IN_USD = 987
const PLAN_IN_EUR = 864

test.describe('Budget planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
    await initBudget(page, 'one-month-empty')
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should save a plan with a comment through the plan modal', async ({ page }) => {
    await page.getByTestId('planning-mode-toggle').click()

    const month = page.getByTestId('budget-month').first()
    await month.getByTestId('planned-balance-change-button').click()

    const planModal = page.getByTestId('plan-modal')
    await expect(planModal).toBeVisible()
    await planModal.getByTestId('plan-amount-input').fill('750')
    await planModal.getByTestId('plan-comment-input').fill('Vacation fund')
    await planModal.getByTestId('plan-save-button').click()

    await expect(planModal).toBeHidden()
    await expect(month.getByTestId('planned-balance-change-button')).toContainText('750')
    await expect(month.getByTestId('plan-comment-text')).toHaveText('Vacation fund')
  })

  test('should not save a plan with a fractional amount', async ({ page }) => {
    await page.getByTestId('planning-mode-toggle').click()
    await page.getByTestId('budget-month').first().getByTestId('planned-balance-change-button').click()

    const planModal = page.getByTestId('plan-modal')
    const amountInput = planModal.getByTestId('plan-amount-input')
    const saveButton = planModal.getByTestId('plan-save-button')

    await amountInput.fill('12.5')
    await expect(amountInput).toHaveClass(/input-error/)
    await expect(saveButton).toBeDisabled()

    await amountInput.fill('12')
    await expect(amountInput).not.toHaveClass(/input-error/)
    await expect(saveButton).toBeEnabled()
  })

  test('should stay out of planning mode until the plans are loaded', async ({ page }) => {
    const response = await page.request.put('/api/budget/plans', {
      data: { year: PLAN_YEAR, month: PLAN_MONTH, plannedBalanceChange: PLAN_IN_USD, comment: 'Trip' },
    })
    expect(response.ok()).toBe(true)

    const planningToggle = page.getByTestId('planning-mode-toggle')
    const planButtons = page.getByTestId('planned-balance-change-button')

    await page.route('**/api/budget/plans*', route => route.abort())
    await planningToggle.click()

    await expect(page.getByTestId('toast-error')).toBeVisible()
    await expect(planButtons).toHaveCount(0)
    await expect(page.getByTestId('incomes-button').first()).toBeVisible()

    await page.unroute('**/api/budget/plans*')
    await planningToggle.click()

    await expect(planButtons.first()).toContainText(String(PLAN_IN_USD))
  })

  test('should convert plans when the main currency changes', async ({ page }) => {
    const response = await page.request.put('/api/budget/plans', {
      data: { year: PLAN_YEAR, month: PLAN_MONTH, plannedBalanceChange: PLAN_IN_USD, comment: null },
    })
    expect(response.ok()).toBe(true)

    await page.getByTestId('planning-mode-toggle').click()
    const planButton = page.getByTestId('budget-month').first().getByTestId('planned-balance-change-button')
    await expect(planButton).toContainText(String(PLAN_IN_USD))

    const currencyPicker = page.getByTestId('budget-header').getByTestId('currency-picker')
    const currencyInput = currencyPicker.getByTestId('currency-picker-input')
    await currencyInput.click()
    await currencyInput.fill('EUR')
    await currencyPicker.getByTestId('currency-picker-dropdown-item')
      .filter({ hasText: /^EUR/ })
      .click()

    await expect(planButton).toContainText(String(PLAN_IN_EUR))

    await planButton.click()
    await expect(page.getByTestId('plan-modal').getByTestId('plan-amount-input')).toHaveValue(String(PLAN_IN_EUR))
  })
})
