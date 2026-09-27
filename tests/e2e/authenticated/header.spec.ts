import { test, expect } from '../fixtures'
import { cleanupUserData } from '../helpers/auth'
import { waitForHydration } from '../helpers/wait-for-hydration'
import { toLocalIsoDate } from '../../../shared/utils/shared/dates'

test.describe('Authenticated Header', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
  })

  test('should display user information', async ({ page }) => {
    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()
    await userDropdown.click()
    const logoutButton = page.getByTestId('logout-btn')
    await expect(logoutButton).toBeVisible()
  })

  test('should have budget button in header', async ({ page }) => {
    const budgetButton = page.getByTestId('budget-btn')
    await expect(budgetButton).toBeVisible()
  })

  test('should have todo button in header', async ({ page }) => {
    const todoButton = page.getByTestId('todo-btn')
    await expect(todoButton).toBeVisible()
  })

  test('should show language and theme pickers in main header on xl screens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await waitForHydration(page)

    const mainHeaderControls = page.getByTestId('desktop-header-actions')
    await expect(mainHeaderControls).toBeVisible()

    await expect(mainHeaderControls.getByTestId('theme-picker-label')).toBeVisible()
    await expect(mainHeaderControls.getByTestId('language-picker-label')).toBeVisible()
  })

  test('should move language and theme pickers to user dropdown on md-lg screens', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await waitForHydration(page)

    const mainHeaderControls = page.getByTestId('desktop-header-actions')
    await expect(mainHeaderControls.getByTestId('theme-picker-label')).toBeHidden()
    await expect(mainHeaderControls.getByTestId('language-picker-label')).toBeHidden()

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()

    const dropdownMenu = page.getByTestId('user-dropdown-content')
    await expect(dropdownMenu.getByTestId('theme-picker-label')).toBeVisible()
    await expect(dropdownMenu.getByTestId('language-picker-label')).toBeVisible()
  })
})

test.describe('Overdue task count', () => {
  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('should count open tasks planned for today or earlier', async ({ page, request }) => {
    const createTask = async (content: string, plannedDate?: string): Promise<{ id: string }> => {
      const response = await request.post('/api/todo', { data: { content, plannedDate } })
      expect(response.ok()).toBe(true)
      return response.json()
    }

    await createTask('Past task', '2020-01-01T00:00')
    await createTask('Task for today', `${toLocalIsoDate(new Date())}T00:00`)
    await createTask('Future task', '2099-01-01T00:00')
    await createTask('Task without date')
    const completedTask = await createTask('Completed task', '2020-01-02T00:00')
    const toggleResponse = await request.put(`/api/todo/${completedTask.id}/toggle`)
    expect(toggleResponse.ok()).toBe(true)

    await page.goto('/budget')
    await waitForHydration(page)
    const overdueCount = page.getByTestId('todo-overdue-count')
    await expect(overdueCount).toHaveText('2')

    await page.getByTestId('todo-btn').click()
    await page.waitForURL('/todo')
    const pastTask = page.getByTestId('todo-card').filter({ hasText: 'Past task' })
    await pastTask.getByTestId('todo-card-checkbox').click()
    await expect(overdueCount).toHaveText('1')
  })
})
