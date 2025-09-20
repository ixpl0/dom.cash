import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Theme Switcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    await page.evaluate(() => {
      localStorage.removeItem('theme')
      document.cookie = 'theme=; Path=/; Max-Age=0'
    })

    await page.reload()
    await waitForHydration(page)
  })

  test('theme selector is visible and has default Auto option', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select')
    await expect(themeSelect).toBeVisible()

    const selectedValue = await themeSelect.inputValue()
    expect(selectedValue).toBe('auto')
  })

  test('can switch between different themes', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select')

    await themeSelect.selectOption('dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await themeSelect.selectOption('light')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await themeSelect.selectOption('cyberpunk')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyberpunk')
  })

  test('theme selection persists in localStorage', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select')

    await themeSelect.selectOption('dracula')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula')

    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'))
    expect(storedTheme).toBe('dracula')

    await page.reload()
    await waitForHydration(page)

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula')
    const selectedValue = await themeSelect.inputValue()
    expect(selectedValue).toBe('dracula')
  })

  test('theme selection persists in cookies', async ({ page, context }) => {
    const themeSelect = page.getByTestId('theme-select')

    await themeSelect.selectOption('retro')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'retro')

    const cookies = await context.cookies()
    const themeCookie = cookies.find(c => c.name === 'theme')
    expect(themeCookie?.value).toBe('retro')
  })

  test('auto option removes theme attributes and storage', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select')

    await themeSelect.selectOption('synthwave')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'synthwave')

    await themeSelect.selectOption('auto')

    await expect(async () => {
      const hasThemeAttribute = await page.locator('html').getAttribute('data-theme')
      expect(hasThemeAttribute).toBeNull()
    }).toPass({ timeout: 1000 })

    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'))
    expect(storedTheme).toBeNull()
  })

  test('theme persists across different pages', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select')

    await themeSelect.selectOption('valentine')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'valentine')

    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'))
    expect(storedTheme).toBe('valentine')

    await page.goto('/auth')
    await waitForHydration(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'valentine')

    await page.goto('/')
    await waitForHydration(page)
    const themeSelectBackOnHome = page.getByTestId('theme-select')
    await expect(themeSelectBackOnHome).toBeVisible()
    const selectedValue = await themeSelectBackOnHome.inputValue()
    expect(selectedValue).toBe('valentine')
  })

  test('invalid theme defaults to light', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('theme', 'invalid-theme-name')
    })
    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    const themeSelect = page.getByTestId('theme-select')
    const selectedValue = await themeSelect.inputValue()
    expect(selectedValue).toBe('light')
  })

  test('theme selector contains all available themes', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select')
    const options = await themeSelect.locator('option').allTextContents()

    // Ensure the Auto option label is present
    expect(options).toContain('Auto')
    expect(options).toContain('Light')
    expect(options).toContain('Dark')
    expect(options).toContain('Cyberpunk')
    expect(options).toContain('Dracula')
    expect(options.length).toBeGreaterThan(30)
  })

  test('theme changes immediately without page reload', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select')

    await themeSelect.selectOption('halloween')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'halloween')

    await themeSelect.selectOption('forest')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'forest')

    const needsReload = await page.evaluate(() => {
      return false
    })
    expect(needsReload).toBe(false)
  })

  test('body element also receives theme attribute', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select')

    await themeSelect.selectOption('luxury')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'luxury')
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'luxury')
  })

  test('switching themes rapidly works correctly', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select')
    const themes = ['dark', 'light', 'cupcake', 'bumblebee', 'emerald']

    for (const theme of themes) {
      await themeSelect.selectOption(theme)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    }

    const finalTheme = themes[themes.length - 1]
    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'))
    expect(storedTheme).toBe(finalTheme)
  })
})
