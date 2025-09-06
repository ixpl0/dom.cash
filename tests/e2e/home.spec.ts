import { test, expect } from '@playwright/test'

test('home page renders correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h2').filter({ hasText: 'dom.cash' })).toBeVisible()
  await expect(page.locator('text=Прозрачность домашних финансов')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Перейти к бюджету' })).toBeVisible()
})

test('navigation to budget page works', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Перейти к бюджету' }).click()
  await page.waitForURL('/budget')
  await expect(page).toHaveURL('/budget')
})
