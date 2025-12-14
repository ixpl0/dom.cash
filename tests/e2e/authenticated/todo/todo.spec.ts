import { test, expect } from '../../fixtures'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { cleanupUserData } from '../../helpers/auth'

test.describe('Todo page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todo')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should display todo page with title and add button', async ({ page }) => {
    const pageContainer = page.getByTestId('todo-page')
    await expect(pageContainer).toBeVisible()

    const addButton = page.getByTestId('todo-add-button')
    await expect(addButton).toBeVisible()
  })

  test('should show empty state when no todos exist', async ({ page }) => {
    const list = page.getByTestId('todo-list')
    await expect(list).toBeVisible()
  })

  test('should open todo modal when clicking add button', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await expect(contentInput).toBeVisible()
  })

  test('should close modal when clicking cancel', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const cancelButton = modal.getByTestId('todo-modal-cancel-button')
    await cancelButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should close modal when pressing Escape', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(modal).not.toBeVisible()
  })

  test('should create a todo item', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.fill('Test todo item')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await saveButton.click()

    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('todo-card-content')).toContainText('Test todo item')
    await expect(card.getByTestId('todo-card-checkbox')).toBeVisible()
  })

  test('should create a todo with date', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.fill('Test todo with date')

    const dateInput = modal.getByTestId('todo-modal-date-input')
    await expect(dateInput).toBeVisible()
    await dateInput.fill('2025-12-31T12:00')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await saveButton.click()

    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('todo-card-content')).toContainText('Test todo with date')
    await expect(card.getByTestId('todo-card-date')).toBeVisible()
  })

  test('should toggle todo completion', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.fill('Toggle test todo')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await saveButton.click()

    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    const checkbox = card.getByTestId('todo-card-checkbox')
    await expect(checkbox).not.toBeChecked()

    await checkbox.click()
    await expect(checkbox).toBeChecked()

    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })

  test('should edit a todo', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    let modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Original content')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.clear()
    await contentInput.fill('Updated content')
    await modal.getByTestId('todo-modal-save-button').click()

    await expect(modal).not.toBeVisible()
    await expect(card.getByTestId('todo-card-content')).toContainText('Updated content')
  })

  test('should delete a todo with confirmation', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Delete test todo')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()

    const deleteButton = card.getByTestId('todo-card-delete-button')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()

    const confirmButton = confirmModal.getByTestId('confirmation-confirm-button')
    await confirmButton.click()

    await expect(card).not.toBeVisible()
  })
})
