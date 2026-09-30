import { test, expect } from '../../fixtures'
import { cleanupUserData, registerUser } from '../../helpers/auth'
import { initBudget } from '../../helpers/budget-setup'
import { createTestEmail } from '../../helpers/users'
import { waitForHydration } from '../../helpers/wait-for-hydration'

test.describe('Read access to a shared budget', () => {
  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('a reader opens the entries of a month but cannot change them', async ({ browser, page, request, workerCredentials }) => {
    await page.goto('/budget')
    await waitForHydration(page)
    await initBudget(page, 'one-month-with-data')

    const readerContext = await browser.newContext()
    const readerPage = await readerContext.newPage()
    const readerEmail = createTestEmail('reader')
    await registerUser(readerPage, readerEmail, 'TestPassword123!')

    const shareResponse = await request.post('/api/budget/shares', { data: { username: readerEmail, access: 'read' } })
    expect(shareResponse.ok()).toBe(true)

    await readerPage.goto(`/budget/${workerCredentials.email}`)
    await waitForHydration(readerPage)
    await readerPage.getByTestId('budget-month').first().getByTestId('incomes-button').click()

    const entryModal = readerPage.getByTestId('entry-modal')
    const entryRows = entryModal.getByTestId('entry-row')
    await expect(entryRows).toHaveCount(2)
    await expect(entryModal.getByTestId('add-entry-button')).toHaveCount(0)
    await expect(entryModal.getByTestId('entry-edit-button')).toHaveCount(0)

    await entryRows.first().click()
    await expect(entryModal.getByTestId('entry-description-input')).toHaveCount(0)

    await entryModal.getByTestId('modal-close-button').click()
    await expect(entryModal).toBeHidden()
    await readerContext.close()
  })
})
