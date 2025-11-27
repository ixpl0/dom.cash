import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Home page (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
  })

  test('home page renders correctly', async ({ page }) => {
    await expect(page.getByTestId('home-title')).toBeVisible()
    await expect(page.getByTestId('home-subtitle')).toBeVisible()
    await expect(page.getByTestId('home-description')).toBeVisible()
    await expect(page.getByTestId('register-btn')).toBeVisible()
    await expect(page.getByTestId('login-btn')).toBeVisible()
  })

  test('demo timeline section renders', async ({ page }) => {
    await expect(page.getByTestId('demo-title')).toBeVisible()
    await expect(page.getByTestId('demo-subtitle')).toBeVisible()
  })

  test('features section renders', async ({ page }) => {
    await expect(page.getByTestId('cta-title')).toBeVisible()
    await expect(page.getByTestId('cta-register-btn')).toBeVisible()
  })

  test('register button navigates to auth page', async ({ page }) => {
    await page.getByTestId('register-btn').click()
    await page.waitForURL(url => url.pathname === '/auth')
  })

  test('login button navigates to auth page', async ({ page }) => {
    await page.getByTestId('login-btn').click()
    await page.waitForURL(url => url.pathname === '/auth')
  })
})
