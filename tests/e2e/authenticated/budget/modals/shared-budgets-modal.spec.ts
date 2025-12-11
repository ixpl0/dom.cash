import { test, expect } from '../../../fixtures'
import { waitForHydration } from '../../../helpers/wait-for-hydration'
import { cleanupUserData } from '../../../helpers/auth'

test.describe('Shared Budgets Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should open shared budgets modal from header button', async ({ page }) => {
    const sharedBudgetsButton = page.getByTestId('shared-budgets-btn')
    await expect(sharedBudgetsButton).toBeVisible()
    await sharedBudgetsButton.click()

    const modal = page.getByTestId('shared-budgets-modal')
    await expect(modal).toBeVisible()
  })

  test('should show empty state when no shared budgets exist', async ({ page }) => {
    const sharedBudgetsButton = page.getByTestId('shared-budgets-btn')
    await sharedBudgetsButton.click()

    const modal = page.getByTestId('shared-budgets-modal')
    await expect(modal).toBeVisible()

    const emptyState = page.getByTestId('shared-budgets-empty-state')
    await expect(emptyState).toBeVisible()
  })

  test('should close modal via close button', async ({ page }) => {
    const sharedBudgetsButton = page.getByTestId('shared-budgets-btn')
    await sharedBudgetsButton.click()

    const modal = page.getByTestId('shared-budgets-modal')
    await expect(modal).toBeVisible()

    const closeButton = page.getByTestId('shared-budgets-modal-close')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should close modal via Escape key', async ({ page }) => {
    const sharedBudgetsButton = page.getByTestId('shared-budgets-btn')
    await sharedBudgetsButton.click()

    const modal = page.getByTestId('shared-budgets-modal')
    await expect(modal).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(modal).not.toBeVisible()
  })
})
