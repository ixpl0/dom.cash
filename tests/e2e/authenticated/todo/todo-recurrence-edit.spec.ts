import { test, expect } from '../../fixtures'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { cleanupUserData } from '../../helpers/auth'

test.describe('Todo recurrence editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todo')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  const createTodoWithRecurrence = async (
    page: import('@playwright/test').Page,
    content: string,
    recurrenceType: 'interval' | 'weekdays' | 'dayOfMonth',
    options?: {
      intervalValue?: number
      intervalUnit?: string
      weekdays?: number[]
      dayOfMonth?: number
    },
  ) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill(content)

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption(recurrenceType)

    if (recurrenceType === 'interval') {
      const intervalValue = modal.getByTestId('recurrence-interval-value')
      await intervalValue.fill(String(options?.intervalValue ?? 1))
      if (options?.intervalUnit) {
        const intervalUnit = modal.getByTestId('recurrence-interval-unit')
        await intervalUnit.selectOption(options.intervalUnit)
      }
    }

    if (recurrenceType === 'weekdays' && options?.weekdays) {
      for (const day of options.weekdays) {
        const checkbox = modal.getByTestId(`recurrence-weekday-checkbox-${day}`)
        await checkbox.click()
      }
    }

    if (recurrenceType === 'dayOfMonth') {
      const dayInput = modal.getByTestId('recurrence-day-of-month')
      await dayInput.fill(String(options?.dayOfMonth ?? 1))
    }

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()
  }

  test('should change recurrence from interval to weekdays', async ({ page }) => {
    await createTodoWithRecurrence(page, 'Interval to weekdays test', 'interval', {
      intervalValue: 2,
      intervalUnit: 'day',
    })

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()

    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    const mondayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-1')
    await expect(mondayCheckbox).toBeVisible()
    await mondayCheckbox.click()

    const fridayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-5')
    await fridayCheckbox.click()

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should change recurrence from weekdays to interval', async ({ page }) => {
    await createTodoWithRecurrence(page, 'Weekdays to interval test', 'weekdays', {
      weekdays: [1, 3, 5],
    })

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('interval')

    const intervalValue = modal.getByTestId('recurrence-interval-value')
    await expect(intervalValue).toBeVisible()
    await intervalValue.fill('7')

    const intervalUnit = modal.getByTestId('recurrence-interval-unit')
    await intervalUnit.selectOption('day')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should change recurrence from weekdays to dayOfMonth', async ({ page }) => {
    await createTodoWithRecurrence(page, 'Weekdays to dayOfMonth test', 'weekdays', {
      weekdays: [0, 6],
    })

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('dayOfMonth')

    const dayInput = modal.getByTestId('recurrence-day-of-month')
    await expect(dayInput).toBeVisible()
    await dayInput.fill('15')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should change recurrence from dayOfMonth to weekdays', async ({ page }) => {
    await createTodoWithRecurrence(page, 'DayOfMonth to weekdays test', 'dayOfMonth', {
      dayOfMonth: 10,
    })

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    const tuesdayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-2')
    await expect(tuesdayCheckbox).toBeVisible()
    await tuesdayCheckbox.click()

    const thursdayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-4')
    await thursdayCheckbox.click()

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should remove recurrence from todo', async ({ page }) => {
    await createTodoWithRecurrence(page, 'Remove recurrence test', 'interval', {
      intervalValue: 3,
      intervalUnit: 'week',
    })

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()

    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('none')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-recurrence-badge')).not.toBeVisible()
  })

  test('should add recurrence to existing todo without recurrence', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Add recurrence later')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-recurrence-badge')).not.toBeVisible()

    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    await expect(modal).toBeVisible()
    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    const wednesdayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-3')
    await expect(wednesdayCheckbox).toBeVisible()
    await wednesdayCheckbox.click()

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should modify weekdays selection in existing weekdays recurrence', async ({ page }) => {
    await createTodoWithRecurrence(page, 'Modify weekdays test', 'weekdays', {
      weekdays: [1, 3, 5],
    })

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const mondayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-1')
    await expect(mondayCheckbox).toBeChecked()
    await mondayCheckbox.click()

    const saturdayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-6')
    await expect(saturdayCheckbox).not.toBeChecked()
    await saturdayCheckbox.click()

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should modify interval value in existing interval recurrence', async ({ page }) => {
    await createTodoWithRecurrence(page, 'Modify interval test', 'interval', {
      intervalValue: 2,
      intervalUnit: 'day',
    })

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const intervalValue = modal.getByTestId('recurrence-interval-value')
    await expect(intervalValue).toHaveValue('2')
    await intervalValue.fill('5')

    const intervalUnit = modal.getByTestId('recurrence-interval-unit')
    await intervalUnit.selectOption('week')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should modify day in existing dayOfMonth recurrence', async ({ page }) => {
    await createTodoWithRecurrence(page, 'Modify dayOfMonth test', 'dayOfMonth', {
      dayOfMonth: 5,
    })

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    await expect(modal).toBeVisible()

    const dayInput = modal.getByTestId('recurrence-day-of-month')
    await expect(dayInput).toHaveValue('5')
    await dayInput.fill('28')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should preserve recurrence when only editing content', async ({ page }) => {
    await createTodoWithRecurrence(page, 'Original content', 'weekdays', {
      weekdays: [1, 2, 3, 4, 5],
    })

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()

    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    const contentInput = modal.getByTestId('todo-modal-content-input')
    await contentInput.clear()
    await contentInput.fill('Updated content')

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    await expect(card.getByTestId('todo-card-content')).toContainText('Updated content')
    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should reset modal state when canceling edits', async ({ page }) => {
    await createTodoWithRecurrence(page, 'Cancel edit test', 'interval', {
      intervalValue: 1,
      intervalUnit: 'day',
    })

    const card = page.getByTestId('todo-card').first()
    const editButton = card.getByTestId('todo-card-edit-button')
    await editButton.click()

    const modal = page.getByTestId('todo-modal')
    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    const mondayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-1')
    await expect(mondayCheckbox).toBeVisible()
    await mondayCheckbox.click()

    await modal.getByTestId('todo-modal-cancel-button').click()
    await expect(modal).not.toBeVisible()

    await editButton.click()
    await expect(modal).toBeVisible()

    await expect(recurrenceSelect).toHaveValue('interval')
    const intervalValue = modal.getByTestId('recurrence-interval-value')
    await expect(intervalValue).toBeVisible()
  })

  test('should handle rapid recurrence type switching', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Rapid switching test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')

    await recurrenceSelect.selectOption('interval')
    await page.waitForTimeout(100)

    await recurrenceSelect.selectOption('weekdays')
    await page.waitForTimeout(100)

    await recurrenceSelect.selectOption('dayOfMonth')
    await page.waitForTimeout(100)

    await recurrenceSelect.selectOption('weekdays')

    const mondayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-1')
    await expect(mondayCheckbox).toBeVisible()
    await mondayCheckbox.click()

    const saveButton = modal.getByTestId('todo-modal-save-button')
    await expect(saveButton).toBeEnabled()

    await saveButton.click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })

  test('should select all weekdays and deselect some', async ({ page }) => {
    const addButton = page.getByTestId('todo-add-button')
    await addButton.click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('All weekdays test')

    const recurrenceSelect = modal.getByTestId('recurrence-type-select')
    await recurrenceSelect.selectOption('weekdays')

    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
      const checkbox = modal.getByTestId(`recurrence-weekday-checkbox-${day}`)
      await checkbox.click()
    }

    const saturdayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-6')
    await saturdayCheckbox.click()
    const sundayCheckbox = modal.getByTestId('recurrence-weekday-checkbox-0')
    await sundayCheckbox.click()

    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const card = page.getByTestId('todo-card').first()
    await expect(card.getByTestId('todo-card-recurrence-badge')).toBeVisible()
  })
})
