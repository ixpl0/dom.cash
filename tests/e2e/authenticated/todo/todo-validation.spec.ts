import { test, expect } from '../../fixtures'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { cleanupUserData } from '../../helpers/auth'

test.describe('Todo validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todo')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should not allow saving empty content', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeDisabled()

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.fill('   ')
    await expect(saveButton).toBeDisabled()
  })

  test('should not allow saving whitespace-only content', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.fill('   \n\t   ')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeDisabled()
  })

  test('should enable save when content is provided', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeDisabled()

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.fill('Valid content')
    await expect(saveButton).toBeEnabled()
  })

  test('should show character count', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.fill('Test content')

    await expect(modal.locator('text=12 / 10000')).toBeVisible()
  })

  test('should disable save when content exceeds max length', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    const contentInput = modal.getByTestId('todo-modal-content-input')

    const longContent = 'a'.repeat(10001)
    await contentInput.fill(longContent)

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeDisabled()

    await expect(contentInput).toHaveClass(/textarea-error/)
  })

  test('should allow saving at exactly max length', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    const contentInput = modal.getByTestId('todo-modal-content-input')

    const maxContent = 'a'.repeat(10000)
    await contentInput.fill(maxContent)

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeEnabled()
  })

  test('should not allow saving weekdays recurrence without selecting any day', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Weekdays validation test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeDisabled()
  })

  test('should enable save after selecting at least one weekday', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Weekdays validation test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeDisabled()

    const mondayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-1')
    await mondayCheckbox.click()

    await expect(saveButton).toBeEnabled()
  })

  test('should disable save after deselecting all weekdays', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Deselect all weekdays test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    const mondayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-1')
    await mondayCheckbox.click()

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeEnabled()

    await mondayCheckbox.click()
    await expect(saveButton).toBeDisabled()
  })

  test('should allow interval recurrence without weekday requirement', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Interval validation test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('interval')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeEnabled()
  })

  test('should allow dayOfMonth recurrence without weekday requirement', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('DayOfMonth validation test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('dayOfMonth')

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeEnabled()
  })

  test('should enforce minimum interval value of 1', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Min interval test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('interval')

    const intervalValue = modal.getByTestId('recurrence-interval-value')
    await expect(intervalValue).toHaveAttribute('min', '1')
  })

  test('should enforce maximum interval value of 365', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Max interval test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('interval')

    const intervalValue = modal.getByTestId('recurrence-interval-value')
    await expect(intervalValue).toHaveAttribute('max', '365')
  })

  test('should enforce minimum dayOfMonth value of 1', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Min day test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('dayOfMonth')

    const dayInput = modal.getByTestId('recurrence-day-of-month')
    await expect(dayInput).toHaveAttribute('min', '1')
  })

  test('should enforce maximum dayOfMonth value of 31', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Max day test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('dayOfMonth')

    const dayInput = modal.getByTestId('recurrence-day-of-month')
    await expect(dayInput).toHaveAttribute('max', '31')
  })

  test('should preserve validation state when editing existing todo', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    let modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Original todo')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.clear()

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeDisabled()

    await contentInput.fill('Updated todo')
    await expect(saveButton).toBeEnabled()
  })
})
