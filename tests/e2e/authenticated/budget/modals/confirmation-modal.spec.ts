import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../../helpers/wait-for-hydration'
import { initBudget } from '../../../helpers/budget-setup'
import { acceptConfirmModal, cancelConfirmModal } from '../../../helpers/confirmation'
import { cleanupUserData } from '../../../helpers/auth'

test.describe('Confirmation Modal Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should show confirmation modal when deleting entry and accept with confirm button', async ({ page }) => {
    await initBudget(page, 'simple')

    const balanceButton = page.getByTestId('balance-button').first()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const entries = modal.getByTestId('entry-row')
    const deleteButton = entries.first().locator('.btn-error')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()
    await expect(confirmModal).toContainText('Удаление записи')
    await expect(confirmModal).toContainText('Cash')

    await acceptConfirmModal(page)

    await expect(entries).toHaveCount(0)
    await expect(confirmModal).not.toBeVisible()
  })

  test('should show confirmation modal when deleting entry and cancel with cancel button', async ({ page }) => {
    await initBudget(page, 'simple')

    const balanceButton = page.getByTestId('balance-button').first()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()

    const entries = modal.getByTestId('entry-row')
    const deleteButton = entries.first().locator('.btn-error')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()

    const cancelButton = confirmModal.getByTestId('confirmation-cancel-button')
    await cancelButton.click()

    await expect(entries).toHaveCount(1)
    await expect(confirmModal).not.toBeVisible()
  })

  test('should accept confirmation modal with Enter key', async ({ page }) => {
    await initBudget(page, 'simple')

    const balanceButton = page.getByTestId('balance-button').first()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    const entries = modal.getByTestId('entry-row')
    const deleteButton = entries.first().locator('.btn-error')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()

    await page.keyboard.press('Enter')

    await expect(entries).toHaveCount(0)
    await expect(confirmModal).not.toBeVisible()
  })

  test('should cancel confirmation modal with Escape key', async ({ page }) => {
    await initBudget(page, 'simple')

    const balanceButton = page.getByTestId('balance-button').first()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    const entries = modal.getByTestId('entry-row')
    const deleteButton = entries.first().locator('.btn-error')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(confirmModal).not.toBeVisible()
    await expect(entries).toHaveCount(1)
  })

  test('should show confirmation modal when deleting month', async ({ page }) => {
    await initBudget(page, 'simple')

    const deleteButtons = page.getByTestId('delete-month-button')
    await expect(deleteButtons).toHaveCount(1)

    await deleteButtons.first().click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()
    await expect(confirmModal).toContainText('Удаление месяца')
    await expect(confirmModal).toContainText('будут безвозвратно удалены')

    await cancelConfirmModal(page)

    await expect(page.getByTestId('budget-month')).toHaveCount(1)
    await expect(confirmModal).not.toBeVisible()
  })

  test('should show different modal variants with appropriate styling', async ({ page }) => {
    await initBudget(page, 'simple')

    // Test danger variant (delete entry)
    const balanceButton = page.getByTestId('balance-button').first()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    const entries = modal.getByTestId('entry-row')
    const deleteButton = entries.first().locator('.btn-error')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()

    // Check for danger styling (red button)
    const confirmBtn = confirmModal.getByTestId('confirmation-confirm-button')
    await expect(confirmBtn).toHaveClass(/btn-error/)

    // Check for icon (any icon within the modal)
    const icon = confirmModal.locator('[class*="icon"], svg, i')
    await expect(icon.first()).toBeVisible()

    await cancelConfirmModal(page)
  })

  test('should close modal when clicking backdrop', async ({ page }) => {
    await initBudget(page, 'simple')

    const balanceButton = page.getByTestId('balance-button').first()
    await balanceButton.click()

    const modal = page.getByTestId('entry-modal')
    const entries = modal.getByTestId('entry-row')
    const deleteButton = entries.first().locator('.btn-error')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()

    await confirmModal.click({ position: { x: 10, y: 10 } })

    await expect(confirmModal).not.toBeVisible()
    await expect(entries).toHaveCount(1)
  })
})
