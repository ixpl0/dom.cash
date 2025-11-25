import { test, expect } from '@playwright/test'
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

  test('should have share button in header', async ({ page }) => {
    const shareButton = page.getByTestId('share-btn')
    await expect(shareButton).toBeVisible()
  })

  test('should have shared budgets button in header', async ({ page }) => {
    const sharedBudgetsButton = page.getByTestId('shared-budgets-btn')
    await expect(sharedBudgetsButton).toBeVisible()
  })

  test('should show language and theme pickers in main header on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    const mainHeaderControls = page.getByTestId('desktop-header-actions')

    await expect(mainHeaderControls.getByTestId('theme-picker-label')).toBeVisible()
    await expect(mainHeaderControls.getByTestId('language-picker-label')).toBeVisible()

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()

    const dropdownMenu = page.getByTestId('user-dropdown-content')
    await expect(dropdownMenu.getByTestId('theme-picker-label')).toBeHidden()
    await expect(dropdownMenu.getByTestId('language-picker-label')).toBeHidden()
  })

  test('should move language and theme pickers to user dropdown on tablet screens', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })

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
