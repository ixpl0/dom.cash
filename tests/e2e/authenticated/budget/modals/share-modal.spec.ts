import { test, expect } from '../../../fixtures'
import { waitForHydration } from '../../../helpers/wait-for-hydration'
import { cleanupUserData } from '../../../helpers/auth'

test.describe('Share Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
  })

  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should open share modal from header button', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await expect(shareButton).toBeVisible()
    await shareButton.click()

    const modal = page.getByTestId('share-modal')
    await expect(modal).toBeVisible()
  })

  test('should show empty state when no shares exist', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const modal = page.getByTestId('share-modal')
    await expect(modal).toBeVisible()

    const emptyState = page.getByTestId('share-empty-state')
    await expect(emptyState).toBeVisible()

    const addFirstButton = page.getByTestId('share-add-first-button')
    await expect(addFirstButton).toBeVisible()
  })

  test('should close modal via close button', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const modal = page.getByTestId('share-modal')
    await expect(modal).toBeVisible()

    const closeButton = page.getByTestId('share-modal-close')
    await closeButton.click()

    await expect(modal).not.toBeVisible()
  })

  test('should close modal via Escape key', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const modal = page.getByTestId('share-modal')
    await expect(modal).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(modal).not.toBeVisible()
  })

  test('should show add new share form when clicking add button', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const modal = page.getByTestId('share-modal')
    await expect(modal).toBeVisible()

    const addFirstButton = page.getByTestId('share-add-first-button')
    await addFirstButton.click()

    const newRow = page.getByTestId('share-new-row')
    await expect(newRow).toBeVisible()

    const usernameInput = page.getByTestId('share-username-input')
    await expect(usernameInput).toBeVisible()

    const accessSelect = page.getByTestId('share-access-select')
    await expect(accessSelect).toBeVisible()
  })

  test('should cancel adding new share', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const addFirstButton = page.getByTestId('share-add-first-button')
    await addFirstButton.click()

    const newRow = page.getByTestId('share-new-row')
    await expect(newRow).toBeVisible()

    const cancelButton = page.getByTestId('share-cancel-add-button')
    await cancelButton.click()

    await expect(newRow).not.toBeVisible()
    await expect(page.getByTestId('share-empty-state')).toBeVisible()
  })

  test('should have default read access selected', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const addFirstButton = page.getByTestId('share-add-first-button')
    await addFirstButton.click()

    const accessSelect = page.getByTestId('share-access-select')
    await expect(accessSelect).toHaveValue('read')
  })

  test('should allow selecting write access', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const addFirstButton = page.getByTestId('share-add-first-button')
    await addFirstButton.click()

    const accessSelect = page.getByTestId('share-access-select')
    await accessSelect.selectOption('write')
    await expect(accessSelect).toHaveValue('write')
  })

  test('should have username input with placeholder', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const addFirstButton = page.getByTestId('share-add-first-button')
    await addFirstButton.click()

    const usernameInput = page.getByTestId('share-username-input')
    await expect(usernameInput).toHaveAttribute('placeholder')
  })

  test('should have confirm and cancel buttons in add form', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const addFirstButton = page.getByTestId('share-add-first-button')
    await addFirstButton.click()

    const confirmButton = page.getByTestId('share-confirm-add-button')
    await expect(confirmButton).toBeVisible()

    const cancelButton = page.getByTestId('share-cancel-add-button')
    await expect(cancelButton).toBeVisible()
  })

  test('should cancel add form via Escape key', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await shareButton.click()

    const addFirstButton = page.getByTestId('share-add-first-button')
    await addFirstButton.click()

    const usernameInput = page.getByTestId('share-username-input')
    await usernameInput.focus()
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('share-new-row')).not.toBeVisible()
  })
})
