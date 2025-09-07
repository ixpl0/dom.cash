import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth')
  })

  test('auth page displays correctly', async ({ page }) => {
    await expect(page.getByText('Добро пожаловать')).toBeVisible()
    await expect(page.getByTestId('username-input')).toBeVisible()
    await expect(page.getByTestId('password-input')).toBeVisible()
    await expect(page.getByTestId('submit-btn')).toBeVisible()
    await expect(page.getByText('Войти через Google')).toBeVisible()
  })

  test('redirects to /auth when accessing protected route', async ({ page }) => {
    await page.goto('/budget')
    await expect(page).toHaveURL('/auth?redirect=/budget')
  })

  test('form inputs enforce minimum length via HTML5 validation', async ({ page }) => {
    const usernameInput = page.getByTestId('username-input')
    const passwordInput = page.getByTestId('password-input')

    await usernameInput.fill('ab')
    await passwordInput.fill('pass123')

    const usernameValidity = await usernameInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    const passwordValidity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid)

    expect(usernameValidity).toBe(false)
    expect(passwordValidity).toBe(false)
  })

  test('form inputs enforce maximum length via HTML5 validation', async ({ page }) => {
    const usernameInput = page.getByTestId('username-input')
    const passwordInput = page.getByTestId('password-input')

    const longUsername = 'a'.repeat(65)
    const longPassword = 'a'.repeat(101)

    await usernameInput.fill(longUsername)
    await passwordInput.fill(longPassword)

    const actualUsername = await usernameInput.inputValue()
    const actualPassword = await passwordInput.inputValue()

    expect(actualUsername.length).toBe(64)
    expect(actualPassword.length).toBe(100)
  })

  test('successful login redirects to home page', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`

    await page.getByTestId('username-input').fill(testUsername)
    await page.getByTestId('password-input').fill('TestPassword123!')
    await page.getByTestId('submit-btn').click()

    await page.waitForURL('/', { timeout: 10000 })
    await expect(page).toHaveURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()
  })

  test('successful login with redirect parameter goes to correct page', async ({ page }) => {
    await page.goto('/auth?redirect=/budget')

    const testUsername = `test_${Date.now()}@example.com`

    await page.getByTestId('username-input').fill(testUsername)
    await page.getByTestId('password-input').fill('TestPassword123!')
    await page.getByTestId('submit-btn').click()

    await page.waitForURL('/budget', { timeout: 10000 })
    await expect(page).toHaveURL('/budget')
  })

  test('Google OAuth button is visible and clickable', async ({ page }) => {
    const googleButton = page.getByText('Войти через Google')
    await expect(googleButton).toBeVisible()
    await expect(googleButton).toBeEnabled()
  })

  test('redirect parameter is preserved in URL', async ({ page }) => {
    await page.goto('/auth?redirect=/budget')
    await expect(page).toHaveURL('/auth?redirect=/budget')

    const googleButton = page.getByText('Войти через Google')
    await expect(googleButton).toBeVisible()
  })

  test('button is clickable when form is valid', async ({ page }) => {
    await page.getByTestId('username-input').fill('testuser')
    await page.getByTestId('password-input').fill('password123')

    const submitButton = page.getByTestId('submit-btn')
    await expect(submitButton).toBeEnabled()
    await expect(submitButton).toContainText('Войти / Зарегистрироваться')
  })

  test('form can be submitted with valid data', async ({ page }) => {
    await page.getByTestId('username-input').fill('testuser')
    await page.getByTestId('password-input').fill('password123')

    const canSubmit = await page.getByTestId('submit-btn').evaluate((btn: HTMLButtonElement) => {
      const form = btn.closest('form')
      return form ? form.checkValidity() : false
    })

    expect(canSubmit).toBe(true)
  })

  test('both login and Google OAuth buttons are visible', async ({ page }) => {
    const submitButton = page.getByTestId('submit-btn')
    const googleButton = page.getByText('Войти через Google')

    await expect(submitButton).toBeVisible()
    await expect(googleButton).toBeVisible()
    await expect(submitButton).toBeEnabled()
    await expect(googleButton).toBeEnabled()
  })

  test('home button is visible', async ({ page }) => {
    const homeButton = page.getByText('На главную')
    await expect(homeButton).toBeVisible()
  })

  test('form inputs have correct attributes', async ({ page }) => {
    const usernameInput = page.getByTestId('username-input')
    const passwordInput = page.getByTestId('password-input')

    await expect(usernameInput).toHaveAttribute('minlength', '3')
    await expect(usernameInput).toHaveAttribute('maxlength', '64')
    await expect(usernameInput).toHaveAttribute('required', '')
    await expect(usernameInput).toHaveAttribute('autocomplete', 'username')

    await expect(passwordInput).toHaveAttribute('minlength', '8')
    await expect(passwordInput).toHaveAttribute('maxlength', '100')
    await expect(passwordInput).toHaveAttribute('required', '')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })

  test('informational text about auto registration', async ({ page }) => {
    await expect(page.getByText('Если у вас нет аккаунта, он будет создан автоматически')).toBeVisible()
  })
})
