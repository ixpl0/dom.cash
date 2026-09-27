import { test, expect } from '../fixtures'
import { waitForHydration } from '../helpers/wait-for-hydration'
import { initBudget } from '../helpers/budget-setup'
import { acceptConfirmModal } from '../helpers/confirmation'
import { cleanupUserData } from '../helpers/auth'
import { pressBrowserBack } from '../helpers/back-navigation'

test.describe('Browser back button', () => {
  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test.describe('Budget page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/budget')
      await waitForHydration(page)
      await initBudget(page, 'simple')
    })

    test('should close entry modal and stay on the page', async ({ page }) => {
      await page.getByTestId('balance-button').first().click()

      const modal = page.getByTestId('entry-modal')
      await expect(modal).toBeVisible()

      await pressBrowserBack(page)

      await expect(modal).not.toBeVisible()
      await expect(page).toHaveURL(/\/budget/)
      await expect(page.getByTestId('budget-timeline')).toBeVisible()
    })

    test('should exit entry edit mode before closing the modal', async ({ page }) => {
      await page.getByTestId('balance-button').first().click()

      const modal = page.getByTestId('entry-modal')
      await modal.getByTestId('entry-edit-button').first().click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await expect(descriptionInput).toBeVisible()

      await pressBrowserBack(page)

      await expect(descriptionInput).not.toBeVisible()
      await expect(modal).toBeVisible()
      await expect(page.getByTestId('confirmation-modal')).not.toBeVisible()

      await pressBrowserBack(page)

      await expect(modal).not.toBeVisible()
      await expect(page).toHaveURL(/\/budget/)
    })

    test('should ask before discarding entry changes and treat back as cancel', async ({ page }) => {
      await page.getByTestId('balance-button').first().click()

      const modal = page.getByTestId('entry-modal')
      await modal.getByTestId('entry-edit-button').first().click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Changed before back')

      const confirmModal = page.getByTestId('confirmation-modal')

      await pressBrowserBack(page)
      await expect(confirmModal).toBeVisible()

      await pressBrowserBack(page)
      await expect(confirmModal).not.toBeVisible()
      await expect(descriptionInput).toHaveValue('Changed before back')

      await pressBrowserBack(page)
      await expect(confirmModal).toBeVisible()
      await acceptConfirmModal(page)

      await expect(descriptionInput).not.toBeVisible()
      await expect(modal).toBeVisible()
      await expect(modal.getByTestId('entry-row').first()).toContainText('Cash')
    })

    test('should cancel confirmation modal on back', async ({ page }) => {
      await page.getByTestId('delete-month-button').first().click()

      const confirmModal = page.getByTestId('confirmation-modal')
      await expect(confirmModal).toBeVisible()

      await pressBrowserBack(page)

      await expect(confirmModal).not.toBeVisible()
      await expect(page.getByTestId('budget-month')).toHaveCount(1)
      await expect(page).toHaveURL(/\/budget/)
    })

    test('should cancel entry editing on Escape and keep the modal open', async ({ page }) => {
      await page.getByTestId('balance-button').first().click()

      const modal = page.getByTestId('entry-modal')
      await modal.getByTestId('entry-edit-button').first().click()

      const descriptionInput = modal.getByTestId('entry-description-input')
      await descriptionInput.fill('Changed before escape')
      await descriptionInput.press('Escape')

      await expect(descriptionInput).not.toBeVisible()
      await expect(modal).toBeVisible()
      await expect(page.getByTestId('confirmation-modal')).not.toBeVisible()
      await expect(modal.getByTestId('entry-row').first()).toContainText('Cash')
    })

    test('should close user menu on back', async ({ page }) => {
      await page.getByTestId('user-dropdown').click()

      const logoutButton = page.getByTestId('logout-btn')
      await expect(logoutButton).toBeVisible()

      await pressBrowserBack(page)

      await expect(logoutButton).not.toBeVisible()
      await expect(page).toHaveURL(/\/budget/)
    })

    test('should navigate to the previous page when nothing is open', async ({ page }) => {
      await page.getByTestId('todo-btn').click()
      await expect(page.getByTestId('todo-page')).toBeVisible()

      await page.goBack()

      await expect(page).toHaveURL(/\/budget/)
      await expect(page.getByTestId('budget-timeline')).toBeVisible()
    })
  })

  test.describe('Todo page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/todo')
      await waitForHydration(page)
    })

    test('should close todo modal on back', async ({ page }) => {
      await page.getByTestId('todo-add-button').click()

      const modal = page.getByTestId('todo-modal')
      await expect(modal).toBeVisible()

      await pressBrowserBack(page)

      await expect(modal).not.toBeVisible()
      await expect(page).toHaveURL(/\/todo/)
    })

    test('should ask before discarding typed todo on back', async ({ page }) => {
      await page.getByTestId('todo-add-button').click()

      const modal = page.getByTestId('todo-modal')
      const contentInput = modal.getByTestId('todo-modal-content-input')
      await contentInput.fill('Unsaved todo')

      const confirmModal = page.getByTestId('confirmation-modal')

      await pressBrowserBack(page)
      await expect(confirmModal).toBeVisible()

      await pressBrowserBack(page)
      await expect(confirmModal).not.toBeVisible()
      await expect(contentInput).toHaveValue('Unsaved todo')

      await pressBrowserBack(page)
      await acceptConfirmModal(page)

      await expect(modal).not.toBeVisible()
      await expect(page).toHaveURL(/\/todo/)
    })
  })
})
