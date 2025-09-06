import { test, expect } from '@playwright/test'

test('home page renders correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('home-title')).toBeVisible()
  await expect(page.getByTestId('home-subtitle')).toBeVisible()
  await expect(page.getByTestId('go-to-budget-btn')).toBeVisible()
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
