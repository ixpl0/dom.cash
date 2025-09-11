import { test, expect } from '@playwright/test'

test.describe('Budget page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget')
  })

  test('should access budget page when authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/\/budget/)

    const budgetLink = page.getByTestId('budget-nav-link')
    await expect(budgetLink).toBeVisible()
  })

  test('should show budget creation UI for new user', async ({ page }) => {
    const noDataMessage = page.getByTestId('no-budget-message')

    if (await noDataMessage.isVisible()) {
      const createMonthButton = page.getByTestId('create-month-btn')
      await expect(createMonthButton).toBeVisible()
    }
    else {
      const budgetTitle = page.getByTestId('budget-title')
      await expect(budgetTitle).toBeVisible()
    }
  })
})
