import { test, expect } from '../../fixtures'
import { cleanupUserData } from '../../helpers/auth'
import { pressBrowserBack } from '../../helpers/back-navigation'
import { allowNotificationsInSettings, createPushEndpoint, openTodoNotifications, readRecordedPushes, sendTodoDigestNow, stubPushService } from '../../helpers/push'
import { waitForHydration } from '../../helpers/wait-for-hydration'
import { toLocalIsoDate } from '../../../../shared/utils/shared/dates'

test.describe('Todo notifications', () => {
  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should turn on notifications, keep the digest settings and turn them off', async ({ page, context, request }) => {
    const endpoint = createPushEndpoint()
    await stubPushService(context, endpoint)
    await page.goto('/todo')
    await waitForHydration(page)
    await openTodoNotifications(page)

    const deviceToggle = page.getByTestId('todo-notifications-device-toggle')
    await expect(deviceToggle).not.toBeChecked()
    await expect(page.getByTestId('todo-notifications-time')).toHaveCount(0)

    await deviceToggle.click()
    await expect(deviceToggle).toBeChecked()
    await expect(page.getByTestId('todo-notifications-time')).toHaveValue('480')
    await expect(page.getByTestId('todo-notifications-denied')).toHaveCount(0)

    const settingsSaved = () => page.waitForResponse(response => response.url().endsWith('/api/push/settings') && response.request().method() === 'PUT')
    await Promise.all([settingsSaved(), page.getByTestId('todo-notifications-time').selectOption('450')])
    await Promise.all([settingsSaved(), page.getByTestId('todo-notifications-weekday-0').uncheck()])
    await Promise.all([settingsSaved(), page.getByTestId('todo-notifications-overdue').selectOption('daily')])
    await Promise.all([settingsSaved(), page.getByTestId('todo-notifications-undated').selectOption('monthly')])

    await page.reload()
    await waitForHydration(page)
    await openTodoNotifications(page)

    await expect(deviceToggle).toBeChecked()
    await expect(page.getByTestId('todo-notifications-denied')).toHaveCount(0)
    await expect(page.getByTestId('todo-notifications-time')).toHaveValue('450')
    await expect(page.getByTestId('todo-notifications-weekday-0')).not.toBeChecked()
    await expect(page.getByTestId('todo-notifications-weekday-1')).toBeChecked()
    await expect(page.getByTestId('todo-notifications-overdue')).toHaveValue('daily')
    await expect(page.getByTestId('todo-notifications-undated')).toHaveValue('monthly')

    const unsubscribed = page.waitForResponse(response => response.url().endsWith('/api/push/unsubscribe'))
    await deviceToggle.click()
    expect((await unsubscribed).ok()).toBe(true)
    await expect(deviceToggle).not.toBeChecked()
    await expect(page.getByTestId('todo-notifications-time')).toHaveCount(0)

    const today = toLocalIsoDate(new Date())
    const createResponse = await request.post('/api/todo', { data: { content: 'Water the plants', plannedDate: `${today}T00:00` } })
    expect(createResponse.ok()).toBe(true)
    expect(await sendTodoDigestNow(request, today)).toBe(0)
    expect(await readRecordedPushes(request, endpoint)).toEqual([])
  })

  test('should send a test notification and the digest to the device', async ({ page, context, request }) => {
    const endpoint = createPushEndpoint()
    await stubPushService(context, endpoint)
    await page.goto('/todo')
    await waitForHydration(page)
    await openTodoNotifications(page)
    await page.getByTestId('todo-notifications-device-toggle').click()
    await expect(page.getByTestId('todo-notifications-test')).toBeVisible()

    await page.getByTestId('todo-notifications-test').click()

    await expect.poll(async () => (await readRecordedPushes(request, endpoint)).map(message => message.tag)).toEqual(['push-test'])

    const today = toLocalIsoDate(new Date())
    const createResponse = await request.post('/api/todo', { data: { content: 'Pay for the internet', plannedDate: `${today}T00:00` } })
    expect(createResponse.ok()).toBe(true)

    expect(await sendTodoDigestNow(request, today)).toBe(1)

    const [, digest] = await readRecordedPushes(request, endpoint)
    expect(digest).toEqual({
      title: '1 task for today',
      body: 'Pay for the internet',
      tag: 'todo-digest',
      url: '/todo',
      isSilent: true,
    })
  })

  test('should remind of tasks without a date when the user asks for it', async ({ page, context, request }) => {
    const endpoint = createPushEndpoint()
    await stubPushService(context, endpoint)
    await page.goto('/todo')
    await waitForHydration(page)
    await openTodoNotifications(page)
    await page.getByTestId('todo-notifications-device-toggle').click()
    await expect(page.getByTestId('todo-notifications-undated')).toHaveValue('off')

    const createResponse = await request.post('/api/todo', { data: { content: 'Close the TBC card' } })
    expect(createResponse.ok()).toBe(true)
    const today = toLocalIsoDate(new Date())
    expect(await sendTodoDigestNow(request, today)).toBe(0)

    const settingsSaved = page.waitForResponse(response => response.url().endsWith('/api/push/settings') && response.request().method() === 'PUT')
    await page.getByTestId('todo-notifications-undated').selectOption('weekly')
    await settingsSaved

    expect(await sendTodoDigestNow(request, today)).toBe(1)
    expect(await readRecordedPushes(request, endpoint)).toEqual([expect.objectContaining({
      title: '1 task without a date',
      body: 'Close the TBC card · no date',
    })])
  })

  test('should explain that notifications are blocked and notice when they get allowed', async ({ page, context }) => {
    await stubPushService(context, createPushEndpoint(), 'denied')
    await page.goto('/todo')
    await waitForHydration(page)
    await openTodoNotifications(page)

    const deviceToggle = page.getByTestId('todo-notifications-device-toggle')
    await deviceToggle.click()

    await expect(page.getByTestId('todo-notifications-denied')).toBeVisible()
    await expect(deviceToggle).not.toBeChecked()

    await allowNotificationsInSettings(page)

    await expect(page.getByTestId('todo-notifications-denied')).toHaveCount(0)
    await deviceToggle.click()
    await expect(deviceToggle).toBeChecked()
    await expect(page.getByTestId('todo-notifications-test')).toBeVisible()
  })

  test('should close the reminders with the back button', async ({ page, context }) => {
    await stubPushService(context, createPushEndpoint())
    await page.goto('/todo')
    await waitForHydration(page)
    await openTodoNotifications(page)

    await pressBrowserBack(page)

    await expect(page.getByTestId('todo-notifications-modal')).not.toBeVisible()
    await expect(page).toHaveURL(/\/todo$/)
  })

  test('should offer to install the app when the browser allows it', async ({ page }) => {
    await page.goto('/todo')
    await waitForHydration(page)

    await page.evaluate(() => {
      const installEvent = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: async () => {
          document.body.dataset.installPrompted = 'true'
        },
      })
      window.dispatchEvent(installEvent)
    })
    await page.getByTestId('user-dropdown').click()
    await page.getByTestId('install-app-btn').click()

    await expect(page.locator('body')).toHaveAttribute('data-install-prompted', 'true')
    await page.getByTestId('user-dropdown').click()
    await expect(page.getByTestId('install-app-btn')).toHaveCount(0)
  })
})
