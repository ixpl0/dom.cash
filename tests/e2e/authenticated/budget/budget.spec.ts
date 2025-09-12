import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../helpers/wait-for-hydration'

test.describe('Budget page', () => {
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
})
