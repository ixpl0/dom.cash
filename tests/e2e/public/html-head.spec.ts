import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('HTML head meta tags', () => {
  test('has correct meta tags in English (default)', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/')
    await waitForHydration(page)

    await expect(page).toHaveTitle(/dom\.cash/)

    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveAttribute('content', /budget|finance/i)

    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute('content', /dom\.cash/)

    const ogDescription = page.locator('meta[property="og:description"]')
    await expect(ogDescription).toHaveAttribute('content', /budget|finance/i)

    const ogType = page.locator('meta[property="og:type"]')
    await expect(ogType).toHaveAttribute('content', 'website')

    const ogUrl = page.locator('meta[property="og:url"]')
    await expect(ogUrl).toHaveAttribute('content', 'https://dom.cash')

    const canonical = page.locator('link[rel="canonical"]')
    await expect(canonical).toHaveAttribute('href', 'https://dom.cash')
  })

  test('has correct lang attribute in English', async ({ page }) => {
    await page.context().clearCookies()
    await page.context().addCookies([{
      name: 'i18n_locale',
      value: 'en',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('/')
    await waitForHydration(page)

    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'en')
  })

  test('has correct lang attribute in Russian', async ({ page }) => {
    await page.context().clearCookies()
    await page.context().addCookies([{
      name: 'i18n_locale',
      value: 'ru',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('/')
    await waitForHydration(page)

    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'ru')
  })

  test('meta description changes with language', async ({ page }) => {
    await page.context().clearCookies()
    await page.context().addCookies([{
      name: 'i18n_locale',
      value: 'ru',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('/')
    await waitForHydration(page)

    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveAttribute('content', /Прозрачность|финанс/i)
  })
})
