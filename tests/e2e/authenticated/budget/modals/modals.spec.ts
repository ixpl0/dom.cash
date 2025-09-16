import { test, expect } from '@playwright/test'
import { waitForHydration } from '../../../helpers/wait-for-hydration'
import { initBudget } from '../../../helpers/budget-setup'

test.describe('Modal tests with budget fixtures', () => {
  test('should import simple budget fixture and verify month creation', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
    await initBudget(page, 'simple')

    const months = page.getByTestId('budget-month')
    await expect(months).toHaveCount(1)

    const month = months.first()
    const balanceButton = month.getByTestId('balance-button')
    await expect(balanceButton).toBeVisible()
    await expect(balanceButton).toContainText('1 000')
  })

  test('should open EntryModal after importing budget', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)
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

    page.once('dialog', (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toContain('несохранённые изменения')
      dialog.accept()
    })

    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })
})
