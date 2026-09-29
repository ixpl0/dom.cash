import { test, expect } from '../fixtures'
import { cleanupUserData } from '../helpers/auth'
import { createDocumentThroughApi, createFolderThroughApi, uploadImageThroughApi } from '../helpers/docs'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Mobile layout', () => {
  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('navigates between pages from the mobile menu', async ({ page }) => {
    await page.goto('/budget')
    await waitForHydration(page)

    await page.getByTestId('mobile-menu-btn').click()
    await page.getByTestId('mobile-todo-btn').click()
    await page.waitForURL('/todo')
    await expect(page.getByTestId('todo-page')).toBeVisible()

    await page.getByTestId('mobile-menu-btn').click()
    await page.getByTestId('mobile-budget-btn').click()
    await page.waitForURL('/budget')

    await page.getByTestId('mobile-menu-btn').click()
    await page.getByTestId('mobile-docs-btn').click()
    await page.waitForURL('/docs')
    await expect(page.getByTestId('docs-page')).toBeVisible()
  })

  test('shows a document with its photos and opens a photo full screen', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport', [{ name: 'Number', value: '45 12 345678' }])
    await uploadImageThroughApi(request, document.id, 'page-1.png')
    await uploadImageThroughApi(request, document.id, 'page-2.png')

    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await expect(page.getByTestId('docs-photo')).toHaveCount(2)
    await expect(page.getByTestId('docs-field-value')).toHaveText(['45 12 345678'])
    expect(await page.evaluate(() => window.document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await page.getByTestId('docs-photo-open').first().click()
    const viewer = page.getByTestId('docs-photo-viewer')
    await expect(viewer.getByTestId('docs-photo-viewer-image')).toBeVisible()
    await viewer.getByTestId('docs-photo-viewer-close').click()
    await expect(viewer).not.toBeVisible()
  })

  test('adds an income through the mobile entry card', async ({ page, request }) => {
    const monthResponse = await request.post('/api/budget/months', { data: { year: 2099, month: 0 } })
    expect(monthResponse.ok()).toBe(true)

    await page.goto('/budget')
    await waitForHydration(page)
    await page.getByTestId('incomes-button').first().click()

    const modal = page.getByTestId('entry-modal')
    await expect(modal).toBeVisible()
    await modal.getByTestId('add-entry-button').click()
    await modal.getByTestId('entry-description-input').fill('Salary')
    await modal.getByTestId('entry-amount-input').fill('1500')
    await modal.getByTestId('entry-save-button').click()

    await expect(modal.getByTestId('entry-row')).toHaveCount(1)
    await expect(modal.getByTestId('entry-row')).toContainText('Salary')
  })

  test('creates and completes a task', async ({ page }) => {
    await page.goto('/todo')
    await waitForHydration(page)
    await page.getByTestId('todo-add-button').click()

    const modal = page.getByTestId('todo-modal')
    await modal.getByTestId('todo-modal-content-input').fill('Buy milk')
    await modal.getByTestId('todo-modal-save-button').click()
    await expect(modal).not.toBeVisible()

    const checkbox = page.getByTestId('todo-card').filter({ hasText: 'Buy milk' }).getByTestId('todo-card-checkbox')
    await checkbox.click()
    await expect(checkbox).toHaveClass(/is-completed/)
  })
})
