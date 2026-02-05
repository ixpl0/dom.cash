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
    await dateInput.fill('2025-12-31')

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
    await contentInput.fill('Toggle test todo unique')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await saveButton.click()

    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').filter({ hasText: 'Toggle test todo unique' })
    await expect(card).toBeVisible()

    const checkbox = card.getByTestId('todo-card-checkbox')
    await expect(checkbox).toBeVisible()
    await expect(checkbox).not.toHaveClass(/is-completed/)

    await checkbox.click()
    await expect(checkbox).toHaveClass(/is-completed/)

    await checkbox.click()
    await expect(checkbox).not.toHaveClass(/is-completed/)
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

  test('should hide completed todos when toggle is enabled', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Hide completed test')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()

    const hideToggle = page.getByTestId('todo-hide-completed-toggle')

    if (!await hideToggle.isChecked()) {
      await hideToggle.click()
    }

    const checkbox = card.getByTestId('todo-card-checkbox')
    await checkbox.click()

    await expect(card).not.toBeVisible()

    await hideToggle.click()

    const completedCard = page.getByTestId('todo-card').first()
    await expect(completedCard).toBeVisible()
  })

  test('should create a recurring todo with interval', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Recurring interval todo')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('interval')

    const intervalValue = modal.getByTestId('recurrence-interval-value')
    await expect(intervalValue).toBeVisible()
    await intervalValue.fill('3')

    const intervalUnit = modal.getByTestId('recurrence-interval-unit')
    await intervalUnit.selectOption('day')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('todo-card-content')).toContainText('Recurring interval todo')
    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should create a recurring todo with weekdays', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Weekday recurring todo')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    const mondayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-1')
    await expect(mondayCheckbox).toBeVisible()
    await mondayCheckbox.click()

    const wednesdayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-3')
    await wednesdayCheckbox.click()

    const fridayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-5')
    await fridayCheckbox.click()

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('todo-card-content')).toContainText('Weekday recurring todo')
    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should create a recurring todo with day of month', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Monthly recurring todo')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('dayOfMonth')

    const dayOfMonth = modal.getByTestId('recurrence-day-of-month')
    await expect(dayOfMonth).toBeVisible()
    await dayOfMonth.fill('15')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()
    await expect(card.getByTestId('todo-card-content')).toContainText('Monthly recurring todo')
    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should not allow saving weekdays recurrence without any day selected', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Invalid weekday todo')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeDisabled()

    const mondayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-1')
    await mondayCheckbox.click()

    await expect(saveButton).toBeEnabled()
  })

  test('should toggle recurring todo and update date instead of completing', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Toggle recurring unique test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('interval')

    const intervalValue = modal.getByTestId('recurrence-interval-value')
    await intervalValue.fill('1')

    const intervalUnit = modal.getByTestId('recurrence-interval-unit')
    await intervalUnit.selectOption('day')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').filter({ hasText: 'Toggle recurring unique test' })
    await expect(card).toBeVisible()

    const checkbox = card.getByTestId('todo-card-checkbox')
    await expect(checkbox).toBeVisible()

    const dateBeforeToggle = await card.getByTestId('todo-card-date').textContent()

    await checkbox.click()

    await page.waitForTimeout(600)

    await expect(checkbox).not.toHaveClass(/is-completed/)

    const dateAfterToggle = await card.getByTestId('todo-card-date').textContent()
    expect(dateAfterToggle).not.toBe(dateBeforeToggle)
  })

  test('should show overdue styling for past date todo', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Overdue todo test')

    const dateInput = modal.getByTestId('todo-modal-date-input')
    await dateInput.fill('2020-01-01')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card).toBeVisible()
    await expect(card).toHaveClass(/border-error/)
  })

  test('should persist hide completed preference after reload', async ({ page }) => {
    const hideToggle = page.getByTestId('todo-hide-completed-toggle').first()
    await expect(hideToggle).toBeVisible()

    const initialState = await hideToggle.isChecked()

    await hideToggle.click()
    await page.waitForTimeout(100)

    const stateAfterClick = await hideToggle.isChecked()
    expect(stateAfterClick).not.toBe(initialState)

    await page.reload()
    await waitForHydration(page)

    const hideToggleAfterReload = page.getByTestId('todo-hide-completed-toggle').first()
    await expect(hideToggleAfterReload).toBeVisible()

    const stateAfterReload = await hideToggleAfterReload.isChecked()
    expect(stateAfterReload).toBe(stateAfterClick)
  })
})
