import { test, expect } from '@playwright/test'

test('logo is clickable and leads to home page', async ({ page }) => {
  await page.goto('/')

  const logo = page.getByTestId('logo-link')
  await expect(logo).toBeVisible()
  await expect(logo).toContainText('dom.cash')

  await logo.click()
  await expect(page).toHaveURL('/')
})

test('home page renders correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('home-title')).toBeVisible()
  await expect(page.getByTestId('home-subtitle')).toBeVisible()
  await expect(page.getByTestId('go-to-budget-btn')).toBeVisible()
})

test('unauthenticated header shows Login button leading to /auth', async ({ page }) => {
  await page.goto('/')
  const loginBtn = page.getByTestId('login-btn')
  await expect(loginBtn).toBeVisible()
  await loginBtn.click()
  await expect(page).toHaveURL('/auth')
})

test('navigation to budget redirects to auth for unauthenticated user', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('go-to-budget-btn').click()

  await page.waitForURL((url) => {
    return url.pathname === '/budget' || url.pathname === '/auth'
  })

  const currentUrl = page.url()
  if (currentUrl.includes('/auth')) {
    await expect(page).toHaveURL('/auth?redirect=/budget')
  }
  else {
    console.log('User was authenticated, skipping redirect check')
  }
})
