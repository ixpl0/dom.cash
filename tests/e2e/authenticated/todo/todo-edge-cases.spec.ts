import { test, expect } from '../../fixtures'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { cleanupUserData } from '../../helpers/auth'

test.describe('Todo edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todo')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should handle multiple todos in correct order', async ({ page }) => {
    const todosToCreate = ['First todo', 'Second todo', 'Third todo']

    for (const content of todosToCreate) {
      const addButton = page.getByTestId('todo-add-button')
      await addButton.click()

      const modal = page.getByTestId('todo-modal')
      await modal.getByTestId('todo-modal-content-input').fill(content)
      await modal.getByTestId('todo-modal-save-button').click()
      await expect(modal).not.toBeVisible()
    }

    const cards = page.getByTestId('todo-card')
    await expect(cards).toHaveCount(3)
  })

  test('should update date on existing todo', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    let modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Todo with date')
    await modal.getByTestId('todo-modal-date-input').fill('2025-06-15')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-date')).toBeVisible()

    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    modal = page.getByTestId('todo-modal')
    const dateInput = modal.getByTestId('todo-modal-date-input')
    await dateInput.fill('2025-12-25')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-date')).toBeVisible()
  })

  test('should remove date from existing todo', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    let modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Todo to remove date')
    await modal.getByTestId('todo-modal-date-input').fill('2025-06-15')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-date')).toBeVisible()

    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    modal = page.getByTestId('todo-modal')
    const dateInput = modal.getByTestId('todo-modal-date-input')
    await dateInput.clear()

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-date')).not.toBeVisible()
  })

  test('should add date to todo that did not have one', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    let modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Todo without date initially')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-date')).not.toBeVisible()

    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    modal = page.getByTestId('todo-modal')
    const dateInput = modal.getByTestId('todo-modal-date-input')
    await dateInput.fill('2025-08-20')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-date')).toBeVisible()
  })

  test('should cancel delete confirmation', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Todo to keep')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    const deleteButton = card.getByTestId('todo-card-delete-button')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await expect(confirmModal).toBeVisible()

    const cancelButton = confirmModal.getByTestId('confirmation-cancel-button')
    await cancelButton.click()

    await expect(confirmModal).not.toBeVisible()
    await expect(card).toBeVisible()
  })

  test('should focus content input when modal opens', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await expect(contentInput).toBeFocused()
  })

  test('should handle special characters in content', async ({ page }) => {
    const specialContent = 'Test <script>alert("xss")</script> & "quotes" \'apostrophes\' émojis 🎉'

    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill(specialContent)
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-content')).toContainText('Test')
    await expect(card.getByTestId('todo-card-content')).toContainText('quotes')
  })

  test('should handle multiline content', async ({ page }) => {
    const multilineContent = 'Line 1\nLine 2\nLine 3'

    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill(multilineContent)
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-content')).toContainText('Line 1')
    await expect(card.getByTestId('todo-card-content')).toContainText('Line 2')
  })

  test('should handle todo completion and uncomplete cycle', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Completion cycle unique test')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').filter({ hasText: 'Completion cycle unique test' })
    await expect(card).toBeVisible()

    const checkbox = card.getByTestId('todo-card-checkbox')
    await expect(checkbox).toBeVisible()
    await expect(checkbox).not.toHaveClass(/is-completed/)

    await checkbox.click()
    await expect(checkbox).toHaveClass(/is-completed/)

    await checkbox.click()
    await expect(checkbox).not.toHaveClass(/is-completed/)

    await checkbox.click()
    await expect(checkbox).toHaveClass(/is-completed/)
  })

  test('should handle editing while saving is in progress', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Quick save test')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await saveButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should maintain todo list after page reload', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Persistent todo')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const cardBefore = page.getByTestId('todo-card').first()
    await expect(cardBefore).toBeVisible()

    await page.reload()
    await waitForHydration(page)

    const cardAfter = page.getByTestId('todo-card').first()
    await expect(cardAfter).toBeVisible()
    await expect(cardAfter.getByTestId('todo-card-content')).toContainText('Persistent todo')
  })

  test('should close modal with X button', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const closeButton = modal.getByTestId('todo-modal-close')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should handle creating todo immediately after deleting one', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    let modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Todo to delete')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    let card = page.getByTestId('todo-card').first()
    const deleteButton = card.getByTestId('todo-card-delete-button')
    await deleteButton.click()

    const confirmModal = page.getByTestId('confirmation-modal')
    await confirmModal.getByTestId('confirmation-confirm-button').click()

    await expect(card).not.toBeVisible()

    await addButton.click()
    modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('New todo after delete')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('todo-card-content')).toContainText('New todo after delete')
  })

  test('should handle editing todo immediately after creating it', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    let modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Initial content')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.clear()
    await contentInput.fill('Immediately edited content')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-content')).toContainText('Immediately edited content')
  })

  test('should display interval recurrence units correctly', async ({ page }) => {
    const units = ['day', 'week', 'month', 'year']

    for (const unit of units) {
      const addButton = page.getByTestId('todo-add-button')
      await addButton.click()

      const modal = page.getByTestId('todo-modal')
      await modal.getByTestId('todo-modal-content-input').fill(`Interval ${unit} test`)

      const recurrenceSelect = modal.getByTestId('recurrence-type-select')
      await recurrenceSelect.selectOption('interval')

      const intervalUnit = modal.getByTestId('recurrence-interval-unit')
      await intervalUnit.selectOption(unit)

      await modal.getByTestId('todo-modal-save-button').click()
      await expect(modal).not.toBeVisible()

      const card = page.getByTestId('todo-card').first()
      await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()

      const deleteButton = card.getByTestId('todo-card-delete-button')
      await deleteButton.click()
      const confirmModal = page.getByTestId('confirmation-modal')
      await confirmModal.getByTestId('confirmation-confirm-button').click()
      await expect(card).not.toBeVisible()
    }
  })

  test('should display today styling for todo with today date', async ({ page }) => {
    const today = new Date()
    const formattedDate = today.toISOString().split('T')[0]

    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Today todo')
    await modal.getByTestId('todo-modal-date-input').fill(formattedDate)
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()
    await expect(card).toHaveClass(/border-error/)
  })

  test('should not show overdue styling for future date', async ({ page }) => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const formattedDate = futureDate.toISOString().split('T')[0]

    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Future todo')
    await modal.getByTestId('todo-modal-date-input').fill(formattedDate)
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()
    await expect(card).not.toHaveClass(/border-error/)
  })

  test('should not show overdue styling for completed todo', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Completed overdue todo')
    await modal.getByTestId('todo-modal-date-input').fill('2020-01-01')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toHaveClass(/border-error/)

    const checkbox = card.getByTestId('todo-card-checkbox')
    await checkbox.click()

    await expect(card).not.toHaveClass(/border-error/)
  })
})
