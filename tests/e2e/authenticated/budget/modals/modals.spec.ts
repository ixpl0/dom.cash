import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../../helpers/wait-for-hydration'
import { initBudget } from '../../../helpers/budget-setup'
import { acceptConfirmModal } from '../../../helpers/confirmation'
import { cleanupUserData } from '../../../helpers/auth'

test.describe('Modal tests with budget fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should import simple budget fixture and verify month creation', async ({ page }) => {
    await initBudget(page, 'simple')

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(1)

    const month = months.first()
    const balanceButton = month.getByTestId('balance-button')
    await expect(balanceButton).toBeVisible()
    await expect(balanceButton).toContainText('1 000')
  })

  test('should open EntryModal after importing budget', async ({ page }) => {
    await initBudget(page, 'simple')

    const balanceButton = page.getByTestId('balance-button').first()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const entries = modal.getByTestId('entry-row')
    await expect(entries).toHaveCount(1)
    await expect(entries.first()).toContainText('Cash')
    await expect(entries.first()).toContainText('1 000')

    const editButton = entries.first().getByTestId('entry-edit-button')
    await editButton.click()

    const descriptionInput = modal.getByTestId('entry-description-input')
    await descriptionInput.fill('Test Edit')

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()
    await acceptConfirmModal(page)
    await expect(modal).not.toBeVisible()
  })

  test('should start editing when clicking on entry cells and focus correct field', async ({ page }) => {
    await initBudget(page, 'simple')

    const balanceButton = page.getByTestId('balance-button').first()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const entry = modal.getByTestId('entry-row').first()

    const descriptionCell = entry.locator('td').first()
    await descriptionCell.click()

    const descriptionInput = modal.getByTestId('entry-description-input')
    await expect(descriptionInput).toBeFocused()
    await expect(descriptionInput).toHaveValue('Cash')

    const cancelButton = modal.getByTestId('entry-cancel-button')
    await cancelButton.click()

    const amountCell = entry.locator('td').nth(1)
    await amountCell.click()

    const amountInput = modal.getByTestId('entry-amount-input')
    await expect(amountInput).toBeFocused()
    await expect(amountInput).toHaveValue('1000')

    const cancelButton2 = modal.getByTestId('entry-cancel-button')
    await cancelButton2.click()

    // Test currency cell click - should start editing mode
    const currencyCell = entry.locator('td').nth(2)
    await currencyCell.click()

    // Check that editing mode started (currency input is visible)
    const currencyInput = modal.getByTestId('currency-picker-input')
    await expect(currencyInput).toBeVisible()

    const cancelButton3 = modal.getByTestId('entry-cancel-button')
    await cancelButton3.click()

    const closeButton = modal.getByTestId('modal-close-button')
    await closeButton.click()
    await expect(modal).not.toBeVisible()
  })
})
