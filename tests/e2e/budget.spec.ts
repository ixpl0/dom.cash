import { test, expect } from './fixtures'

test.describe('Budget page', () => {
  test('should access budget page when authenticated', async ({ page }) => {
    await page.goto('/budget')
    await expect(page).toHaveURL(/\/budget/)

    const budgetLink = page.getByTestId('budget-nav-link')
    await expect(budgetLink).toBeVisible()
  })

  test('should display user information in header', async ({ page }) => {
    await page.goto('/budget')

    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()

    await userDropdown.click()
    const logoutButton = page.getByTestId('logout-btn')
    await expect(logoutButton).toBeVisible()
  })

  test('should show budget creation UI for new user', async ({ page }) => {
    await page.goto('/budget')

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

  test('should have share button in header', async ({ page }) => {
    await page.goto('/budget')

    const shareButton = page.getByTestId('share-btn')
    await expect(shareButton).toBeVisible()
  })

  test('should have shared budgets button in header', async ({ page }) => {
    await page.goto('/budget')

    const sharedBudgetsButton = page.getByTestId('shared-budgets-btn')
    await expect(sharedBudgetsButton).toBeVisible()
  })
})
