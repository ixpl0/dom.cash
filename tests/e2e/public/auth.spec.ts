import { test, expect } from '@playwright/test'
import { INPUT_LIMITS } from '../constants'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth')
  })

  test('auth page displays correctly', async ({ page }) => {
    await expect(page.getByTestId('welcome-text')).toBeVisible()
    await expect(page.getByTestId('username-input')).toBeVisible()
    await expect(page.getByTestId('password-input')).toBeVisible()
    await expect(page.getByTestId('submit-btn')).toBeVisible()
    await expect(page.getByTestId('google-auth-btn')).toBeVisible()
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

    const longUsername = 'a'.repeat(INPUT_LIMITS.USERNAME_MAX + 1)
    const longPassword = 'a'.repeat(INPUT_LIMITS.PASSWORD_MAX + 1)

    await usernameInput.fill(longUsername)
    await passwordInput.fill(longPassword)

    const actualUsername = await usernameInput.inputValue()
    const actualPassword = await passwordInput.inputValue()

    expect(actualUsername.length).toBe(INPUT_LIMITS.USERNAME_MAX)
    expect(actualPassword.length).toBe(INPUT_LIMITS.PASSWORD_MAX)
  })

  test('successful login redirects to home page', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`

    await waitForHydration(page)

    await page.getByTestId('username-input').fill(testUsername)
    await page.getByTestId('password-input').fill('TestPassword123!')
    await page.getByTestId('submit-btn').click()

    await page.waitForURL('/')
    await expect(page).toHaveURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()
  })

  test('successful login with redirect parameter goes to correct page', async ({ page }) => {
    await page.goto('/auth?redirect=/budget')

    const testUsername = `test_${Date.now()}@example.com`

    // Ждём гидрации Vue компонента
    await waitForHydration(page)

    await page.getByTestId('username-input').fill(testUsername)
    await page.getByTestId('password-input').fill('TestPassword123!')

    // Используем Promise.all для одновременного ожидания навигации и клика
    await Promise.all([
      page.waitForURL('/budget'),
      page.getByTestId('submit-btn').click(),
    ])

    await expect(page).toHaveURL('/budget')
  })

  test('Google OAuth button is visible and clickable', async ({ page }) => {
    const googleButton = page.getByTestId('google-auth-btn')
    await expect(googleButton).toBeVisible()
    await expect(googleButton).toBeEnabled()
  })

  test('redirect parameter is preserved in URL', async ({ page }) => {
    await page.goto('/auth?redirect=/budget')
    await expect(page).toHaveURL('/auth?redirect=/budget')

    const googleButton = page.getByTestId('google-auth-btn')
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
    const googleButton = page.getByTestId('google-auth-btn')

    await expect(submitButton).toBeVisible()
    await expect(googleButton).toBeVisible()
    await expect(submitButton).toBeEnabled()
    await expect(googleButton).toBeEnabled()
  })

  test('home button is visible', async ({ page }) => {
    const homeButton = page.getByTestId('home-btn')
    await expect(homeButton).toBeVisible()
  })

  test('form inputs have correct attributes', async ({ page }) => {
    const usernameInput = page.getByTestId('username-input')
    const passwordInput = page.getByTestId('password-input')

    await expect(usernameInput).toHaveAttribute('minlength', INPUT_LIMITS.USERNAME_MIN.toString())
    await expect(usernameInput).toHaveAttribute('maxlength', INPUT_LIMITS.USERNAME_MAX.toString())
    await expect(usernameInput).toHaveAttribute('required', '')
    await expect(usernameInput).toHaveAttribute('autocomplete', 'username')

    await expect(passwordInput).toHaveAttribute('minlength', INPUT_LIMITS.PASSWORD_MIN.toString())
    await expect(passwordInput).toHaveAttribute('maxlength', INPUT_LIMITS.PASSWORD_MAX.toString())
    await expect(passwordInput).toHaveAttribute('required', '')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })

  test('informational text about auto registration', async ({ page }) => {
    await expect(page.getByTestId('auto-register-text')).toBeVisible()
  })

  test('home button navigates to home page', async ({ page }) => {
    const homeButton = page.getByTestId('home-btn')
    await homeButton.click()
    await expect(page).toHaveURL('/')
  })

  test('shows error for incorrect password', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const correctPassword = 'TestPassword123!'
    const incorrectPassword = 'WrongPassword456!'

    await waitForHydration(page)

    await page.getByTestId('username-input').fill(testUsername)
    await page.getByTestId('password-input').fill(correctPassword)
    await page.getByTestId('submit-btn').click()

    await page.waitForURL('/')
    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()

    await userDropdown.click()
    const logoutButton = page.getByTestId('logout-btn')
    await logoutButton.click()

    await page.waitForURL('/')
    await expect(userDropdown).not.toBeVisible()

    await page.goto('/auth')
    await waitForHydration(page)

    await page.getByTestId('username-input').fill(testUsername)
    await page.getByTestId('password-input').fill(incorrectPassword)
    await page.getByTestId('submit-btn').click()

    await expect(page).toHaveURL('/auth')
  })
})
