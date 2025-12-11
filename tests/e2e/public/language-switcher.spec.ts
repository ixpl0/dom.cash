import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Language Switcher', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await waitForHydration(page)
  })

  test('language selector is visible and has default English option', async ({ page }) => {
    const languageSelect = page.getByTestId('language-select').first()
    await expect(languageSelect).toBeVisible()

    const selectedValue = await languageSelect.inputValue()
    expect(selectedValue).toBe('en')
  })

  test('can switch between English and Russian', async ({ page }) => {
    const languageSelect = page.getByTestId('language-select').first()

    await languageSelect.selectOption('ru')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

    await languageSelect.selectOption('en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('language selection persists after reload', async ({ page }) => {
    const languageSelect = page.getByTestId('language-select').first()

    await languageSelect.selectOption('ru')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

    await page.reload()
    await waitForHydration(page)

    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    const selectedValue = await languageSelect.inputValue()
    expect(selectedValue).toBe('ru')
  })

  test('language persists across different pages', async ({ page }) => {
    const languageSelect = page.getByTestId('language-select').first()

    await languageSelect.selectOption('ru')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

    await page.goto('/auth')
    await waitForHydration(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

    await page.goto('/')
    await waitForHydration(page)
    const languageSelectBackOnHome = page.getByTestId('language-select').first()
    await expect(languageSelectBackOnHome).toBeVisible()
    const selectedValue = await languageSelectBackOnHome.inputValue()
    expect(selectedValue).toBe('ru')
  })

  test('language selector contains all available languages', async ({ page }) => {
    const languageSelect = page.getByTestId('language-select').first()
    const options = await languageSelect.locator('option').allTextContents()

    expect(options).toContain('English')
    expect(options).toContain('Русский')
    expect(options.length).toBe(2)
  })

  test('language changes UI text immediately', async ({ page }) => {
    const loginButton = page.getByTestId('login-btn')
    await expect(loginButton).toBeVisible()
    await expect(loginButton).toContainText('Login')

    const languageSelect = page.getByTestId('language-select').first()
    await languageSelect.selectOption('ru')

    await expect(loginButton).toContainText('Войти')

    await languageSelect.selectOption('en')
    await expect(loginButton).toContainText('Login')
  })
})
