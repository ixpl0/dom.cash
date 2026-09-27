import { test, expect } from '../../fixtures'
import { cleanupUserData, registerUser } from '../../helpers/auth'
import { createTestEmail } from '../../helpers/users'
import { waitForHydration } from '../../helpers/wait-for-hydration'

test.describe('Live budget updates', () => {
  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('a viewer sees a month added by the owner without reloading the page', async ({ browser, request, workerCredentials }) => {
    const viewerContext = await browser.newContext()
    const viewerPage = await viewerContext.newPage()
    const viewerEmail = createTestEmail('viewer')
    await registerUser(viewerPage, viewerEmail, 'TestPassword123!')

    const shareResponse = await request.post('/api/budget/shares', { data: { username: viewerEmail, access: 'read' } })
    expect(shareResponse.ok()).toBe(true)
    const firstMonthResponse = await request.post('/api/budget/months', { data: { year: 2099, month: 0 } })
    expect(firstMonthResponse.ok()).toBe(true)

    const subscribed = viewerPage.waitForResponse(response =>
      response.url().includes('/api/notifications/subscribe/') && response.ok())
    await viewerPage.goto(`/budget/${workerCredentials.email}`)
    await waitForHydration(viewerPage)
    await subscribed

    const months = viewerPage.getByTestId('budget-month')
    await expect(months).toHaveCount(1)

    const secondMonthResponse = await request.post('/api/budget/months', { data: { year: 2099, month: 1 } })
    expect(secondMonthResponse.ok()).toBe(true)

    await expect(months).toHaveCount(2)
    await viewerContext.close()
  })
})
