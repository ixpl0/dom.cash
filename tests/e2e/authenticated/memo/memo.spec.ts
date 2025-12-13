import { test, expect } from '../../fixtures'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { cleanupUserData } from '../../helpers/auth'

test.describe('Memo page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memo')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should display memo page with title and add button', async ({ page }) => {
    const pageContainer = page.getByTestId('memo-page')
    await expect(pageContainer).toBeVisible()

    const addButton = page.getByTestId('memo-add-button')
    await expect(addButton).toBeVisible()
  })

  test('should show empty state when no memos exist', async ({ page }) => {
    const list = page.getByTestId('memo-list')
    await expect(list).toBeVisible()
  })

  test('should open memo modal when clicking add button', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')
    await addButton.click()

    const modal = page.getByTestId('memo-modal')
    await expect(modal).toBeVisible()

    const typeSelect = modal.getByTestId('memo-modal-type-select')
    await expect(typeSelect).toBeVisible()

    const contentInput = modal.getByTestId('memo-modal-content-input')
    await expect(contentInput).toBeVisible()
  })

  test('should close modal when clicking cancel', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')
    await addButton.click()

    const modal = page.getByTestId('memo-modal')
    await expect(modal).toBeVisible()

    const cancelButton = modal.getByTestId('memo-modal-cancel-button')
    await cancelButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should close modal when pressing Escape', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')
    await addButton.click()

    const modal = page.getByTestId('memo-modal')
    await expect(modal).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(modal).not.toBeVisible()
  })

  test('should create a todo item', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')
    await addButton.click()

    const modal = page.getByTestId('memo-modal')
    await expect(modal).toBeVisible()

    const typeSelect = modal.getByTestId('memo-modal-type-select')
    await typeSelect.selectOption('todo')

    const contentInput = modal.getByTestId('memo-modal-content-input')
    await contentInput.fill('Test todo item')

    const saveButton = modal.getByTestId('memo-modal-save-button')
    await saveButton.click()

    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('memo-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('memo-card-content')).toContainText('Test todo item')
    await expect(card.getByTestId('memo-card-checkbox')).toBeVisible()
  })

  test('should create a memo item', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')
    await addButton.click()

    const modal = page.getByTestId('memo-modal')
    const typeSelect = modal.getByTestId('memo-modal-type-select')
    await typeSelect.selectOption('memo')

    const contentInput = modal.getByTestId('memo-modal-content-input')
    await contentInput.fill('Test memo note')

    const saveButton = modal.getByTestId('memo-modal-save-button')
    await saveButton.click()

    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('memo-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('memo-card-content')).toContainText('Test memo note')
  })

  test('should create a plan item with date', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')
    await addButton.click()

    const modal = page.getByTestId('memo-modal')
    const typeSelect = modal.getByTestId('memo-modal-type-select')
    await typeSelect.selectOption('plan')

    const contentInput = modal.getByTestId('memo-modal-content-input')
    await contentInput.fill('Test plan with date')

    const dateInput = modal.getByTestId('memo-modal-date-input')
    await expect(dateInput).toBeVisible()
    await dateInput.fill('2025-12-31')

    const saveButton = modal.getByTestId('memo-modal-save-button')
    await saveButton.click()

    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('memo-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('memo-card-content')).toContainText('Test plan with date')
    await expect(card.getByTestId('memo-card-date')).toBeVisible()
  })

  test('should toggle todo completion', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')
    await addButton.click()

    const modal = page.getByTestId('memo-modal')
    const typeSelect = modal.getByTestId('memo-modal-type-select')
    await typeSelect.selectOption('todo')

    const contentInput = modal.getByTestId('memo-modal-content-input')
    await contentInput.fill('Toggle test todo')

    const saveButton = modal.getByTestId('memo-modal-save-button')
    await saveButton.click()

    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('memo-card').first()
    const checkbox = card.getByTestId('memo-card-checkbox')
    await expect(checkbox).not.toBeChecked()

    await checkbox.click()
    await expect(checkbox).toBeChecked()

    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })

  test('should filter memos by type', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')

    await addButton.click()
    let modal = page.getByTestId('memo-modal')
    await modal.getByTestId('memo-modal-type-select').selectOption('todo')
    await modal.getByTestId('memo-modal-content-input').fill('Filter test todo')
    await modal.getByTestId('memo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await addButton.click()
    modal = page.getByTestId('memo-modal')
    await modal.getByTestId('memo-modal-type-select').selectOption('memo')
    await modal.getByTestId('memo-modal-content-input').fill('Filter test memo')
    await modal.getByTestId('memo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const allFilter = page.getByTestId('memo-filter-all')
    const todoFilter = page.getByTestId('memo-filter-todo')
    const memoFilter = page.getByTestId('memo-filter-memo')

    await expect(page.getByTestId('memo-card')).toHaveCount(2)

    await todoFilter.click()
    await expect(page.getByTestId('memo-card')).toHaveCount(1)
    await expect(page.getByTestId('memo-card').first().getByTestId('memo-card-content')).toContainText('Filter test todo')

    await memoFilter.click()
    await expect(page.getByTestId('memo-card')).toHaveCount(1)
    await expect(page.getByTestId('memo-card').first().getByTestId('memo-card-content')).toContainText('Filter test memo')

    await allFilter.click()
    await expect(page.getByTestId('memo-card')).toHaveCount(2)
  })

  test('should edit a memo', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')
    await addButton.click()

    let modal = page.getByTestId('memo-modal')
    await modal.getByTestId('memo-modal-type-select').selectOption('memo')
    await modal.getByTestId('memo-modal-content-input').fill('Original content')
    await modal.getByTestId('memo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('memo-card').first()
    const editButton = card.getByTestId('memo-card-edit-button')
    await editButton.click()

    modal = page.getByTestId('memo-modal')
    await expect(modal).toBeVisible()

    const contentInput = modal.getByTestId('memo-modal-content-input')
    await contentInput.clear()
    await contentInput.fill('Updated content')
    await modal.getByTestId('memo-modal-save-button').click()

    await expect(modal).not.toBeVisible()
    await expect(card.getByTestId('memo-card-content')).toContainText('Updated content')
  })

  test('should delete a memo with confirmation', async ({ page }) => {
    const addButton = page.getByTestId('memo-add-button')
    await addButton.click()

    const modal = page.getByTestId('memo-modal')
    await modal.getByTestId('memo-modal-type-select').selectOption('memo')
    await modal.getByTestId('memo-modal-content-input').fill('Delete test memo')
    await modal.getByTestId('memo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('memo-card').first()
    await expect(card).toBeVisible()

    const deleteButton = card.getByTestId('memo-card-delete-button')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()

    const confirmButton = confirmModal.getByTestId('confirmation-confirm-button')
    await confirmButton.click()

    await expect(card).not.toBeVisible()
  })
})
