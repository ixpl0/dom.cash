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

    await expect(page).toHaveURL(/\/budget/)
  })
})
