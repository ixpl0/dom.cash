import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
  })

  test('home page renders correctly', async ({ page }) => {
    await expect(page.getByTestId('home-title')).toBeVisible()
    await expect(page.getByTestId('home-subtitle')).toBeVisible()
    await expect(page.getByTestId('go-to-budget-btn')).toBeVisible()
  })

  test('navigation to budget redirects to auth for unauthenticated user', async ({ page }) => {
    await page.getByTestId('go-to-budget-btn').click()
    await page.waitForURL(url => url.pathname === '/auth')

    const url = new URL(page.url())
    const redirect = url.searchParams.get('redirect')
    expect(redirect).toBe('/budget')
  })
})
