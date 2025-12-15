import { test, expect } from '../fixtures'
import { waitForHydration } from '../helpers/wait-for-hydration'

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
