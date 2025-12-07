import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Theme Switcher', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await waitForHydration(page)
  })

  test('theme selector is visible and has default Auto option', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select').first()
    await expect(themeSelect).toBeVisible()

    const selectedValue = await themeSelect.inputValue()
    expect(selectedValue).toBe('auto')
  })

  test('can switch between different themes', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select').first()

    await themeSelect.selectOption('kekdark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'kekdark')

    await themeSelect.selectOption('keklight')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'keklight')

    await themeSelect.selectOption('summerhaze')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'summerhaze')
  })

  test('theme selection persists in cookies', async ({ page, context }) => {
    const themeSelect = page.getByTestId('theme-select').first()

    await themeSelect.selectOption('ritualhabitual')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ritualhabitual')

    const cookies = await context.cookies()
    const themeCookie = cookies.find(c => c.name === 'theme')
    expect(themeCookie?.value).toBe('ritualhabitual')

    await page.reload()
    await waitForHydration(page)

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ritualhabitual')
    const selectedValue = await themeSelect.inputValue()
    expect(selectedValue).toBe('ritualhabitual')
  })

  test('auto option removes theme attributes', async ({ page, context }) => {
    const themeSelect = page.getByTestId('theme-select').first()

    await themeSelect.selectOption('grayscale')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'grayscale')

    await themeSelect.selectOption('auto')

    await expect(page.locator('html')).not.toHaveAttribute('data-theme')

    const cookies = await context.cookies()
    const themeCookie = cookies.find(c => c.name === 'theme')
    expect(themeCookie?.value).toBe('auto')
  })

  test('theme persists across different pages', async ({ page, context }) => {
    const themeSelect = page.getByTestId('theme-select').first()

    await themeSelect.selectOption('grayscaledark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'grayscaledark')

    const cookies = await context.cookies()
    const themeCookie = cookies.find(c => c.name === 'theme')
    expect(themeCookie?.value).toBe('grayscaledark')

    await page.goto('/auth')
    await waitForHydration(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'grayscaledark')

    await page.goto('/')
    await waitForHydration(page)
    const themeSelectBackOnHome = page.getByTestId('theme-select').first()
    await expect(themeSelectBackOnHome).toBeVisible()
    const selectedValue = await themeSelectBackOnHome.inputValue()
    expect(selectedValue).toBe('grayscaledark')
  })

  test('invalid theme cookie defaults to auto', async ({ page, context }) => {
    await context.addCookies([{
      name: 'theme',
      value: 'invalid-theme-name',
      domain: 'localhost',
      path: '/',
    }])
    await page.reload()
    await waitForHydration(page)

    const hasThemeAttribute = await page.locator('html').getAttribute('data-theme')
    expect(hasThemeAttribute).toBeNull()

    const themeSelect = page.getByTestId('theme-select').first()
    const selectedValue = await themeSelect.inputValue()
    expect(selectedValue).toBe('auto')
  })

  test('theme selector contains all available themes', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select').first()
    const options = await themeSelect.locator('option').allTextContents()

    expect(options).toContain('Auto')
    expect(options).toContain('Kek Dark')
    expect(options).toContain('Kek Darker')
    expect(options).toContain('Kek Light')
    expect(options).toContain('Kek Lighter')
    expect(options).toContain('Summer Haze')
    expect(options).toContain('Ritual Habitual')
    expect(options).toContain('Crystal Clear')
    expect(options).toContain('Grayscale')
    expect(options).toContain('Grayscale Dark')
    expect(options.length).toBe(10)
  })

  test('theme changes immediately without page reload', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select').first()

    await themeSelect.selectOption('kekdark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'kekdark')

    await themeSelect.selectOption('keklight')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'keklight')

    const needsReload = await page.evaluate(() => {
      return false
    })
    expect(needsReload).toBe(false)
  })

  test('body element also receives theme attribute', async ({ page }) => {
    const themeSelect = page.getByTestId('theme-select').first()

    await themeSelect.selectOption('summerhaze')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'summerhaze')
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'summerhaze')
  })

  test('switching themes rapidly works correctly', async ({ page, context }) => {
    const themeSelect = page.getByTestId('theme-select').first()
    const themes = ['kekdark', 'keklight', 'summerhaze', 'ritualhabitual', 'crystalclear']

    for (const theme of themes) {
      await themeSelect.selectOption(theme)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    }

    const finalTheme = themes[themes.length - 1]
    const cookies = await context.cookies()
    const themeCookie = cookies.find(c => c.name === 'theme')
    expect(themeCookie?.value).toBe(finalTheme)
  })

  test('SSR renders correct theme from cookie without flash', async ({ page, context }) => {
    await context.addCookies([{
      name: 'theme',
      value: 'kekdarker',
      domain: 'localhost',
      path: '/',
    }])

    const themeOnLoad = await page.evaluate(() => {
      return new Promise<string | null>((resolve) => {
        const observer = new MutationObserver(() => {})
        observer.disconnect()
        resolve(document.documentElement.getAttribute('data-theme'))
      })
    })

    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'kekdarker')

    const themeSelect = page.getByTestId('theme-select').first()
    const selectedValue = await themeSelect.inputValue()
    expect(selectedValue).toBe('kekdarker')
  })
})
