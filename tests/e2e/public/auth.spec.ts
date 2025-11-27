import { test, expect } from '@playwright/test'
import { INPUT_LIMITS, DEV_VERIFICATION_CODE } from '../constants'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth')
    await waitForHydration(page)
  })

  test('auth page displays correctly', async ({ page }) => {
    await expect(page.getByTestId('welcome-text')).toBeVisible()
    await expect(page.getByTestId('email-input')).toBeVisible()
    await expect(page.getByTestId('password-input')).toBeVisible()
    await expect(page.getByTestId('login-btn')).toBeVisible()
    await expect(page.getByTestId('google-auth-btn')).toBeVisible()
  })

  test('redirects to /auth when accessing protected route', async ({ page }) => {
    await page.goto('/budget')
    await expect(page).toHaveURL('/auth?redirect=/budget')
  })

  test('form inputs enforce minimum length via HTML5 validation', async ({ page }) => {
    const usernameInput = page.getByTestId('email-input')
    const passwordInput = page.getByTestId('password-input')

    await usernameInput.fill('ab')
    await passwordInput.fill('pass123')

    const usernameValidity = await usernameInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    const passwordValidity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid)

    expect(usernameValidity).toBe(false)
    expect(passwordValidity).toBe(false)
  })

  test('form inputs enforce maximum length via HTML5 validation', async ({ page }) => {
    const usernameInput = page.getByTestId('email-input')
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

  test('successful registration redirects to home page', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill('TestPassword123!')
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()

    await page.waitForURL('/')
    await expect(page).toHaveURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await expect(userDropdown).toBeVisible()
  })

  test('successful login with redirect parameter goes to correct page', async ({ page }) => {
    await page.goto('/auth?redirect=/budget')
    await waitForHydration(page)

    const testUsername = `test_${Date.now()}@example.com`

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill('TestPassword123!')
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()

    await page.waitForURL('/budget')
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
  })

  test('login, register and Google OAuth buttons are visible and enabled', async ({ page }) => {
    const loginButton = page.getByTestId('login-btn')
    const registerButton = page.getByTestId('register-btn')
    const googleButton = page.getByTestId('google-auth-btn')

    await expect(loginButton).toBeVisible()
    await expect(registerButton).toBeVisible()
    await expect(googleButton).toBeVisible()
    await expect(loginButton).toBeEnabled()
    await expect(registerButton).toBeEnabled()
    await expect(googleButton).toBeEnabled()
  })

  test('form inputs have correct attributes', async ({ page }) => {
    const emailInput = page.getByTestId('email-input')
    const passwordInput = page.getByTestId('password-input')

    await expect(emailInput).toHaveAttribute('minlength', INPUT_LIMITS.USERNAME_MIN.toString())
    await expect(emailInput).toHaveAttribute('maxlength', INPUT_LIMITS.USERNAME_MAX.toString())
    await expect(emailInput).toHaveAttribute('required', '')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')

    await expect(passwordInput).toHaveAttribute('minlength', INPUT_LIMITS.PASSWORD_MIN.toString())
    await expect(passwordInput).toHaveAttribute('maxlength', INPUT_LIMITS.PASSWORD_MAX.toString())
    await expect(passwordInput).toHaveAttribute('required', '')
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })

  test('home button navigates to home page', async ({ page }) => {
    const homeButton = page.getByTestId('home-btn')

    await expect(homeButton).toBeVisible()
    await homeButton.click()
    await page.waitForURL('/')
    await expect(page).toHaveURL('/')
  })

  test('shows error for incorrect password', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const correctPassword = 'TestPassword123!'
    const incorrectPassword = 'WrongPassword456!'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(correctPassword)
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()

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

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(incorrectPassword)
    await page.getByTestId('login-btn').click()

    await expect(page).toHaveURL('/auth')
  })

  test('blocks verification after 3 failed attempts', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    const wrongCode = '000000'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(testPassword)
    await page.getByTestId('register-btn').click()

    await expect(page.getByTestId('verification-code-input')).toBeVisible()

    for (let i = 0; i < 3; i++) {
      await page.getByTestId('verification-code-input').fill(wrongCode)
      await page.getByTestId('verify-code-btn').click()
      await page.waitForTimeout(500)
    }

    await expect(page.getByTestId('auth-error')).toBeVisible()
    const errorText = await page.getByTestId('auth-error').textContent()
    expect(errorText).toContain('Too many failed attempts')
  })

  test('correct code works after failed attempts within limit', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    const wrongCode = '000000'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(testPassword)
    await page.getByTestId('register-btn').click()

    await expect(page.getByTestId('verification-code-input')).toBeVisible()

    await page.getByTestId('verification-code-input').fill(wrongCode)
    await page.getByTestId('verify-code-btn').click()
    await page.waitForTimeout(500)

    await page.getByTestId('verification-code-input').fill(wrongCode)
    await page.getByTestId('verify-code-btn').click()
    await page.waitForTimeout(500)

    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()

    await page.waitForURL('/')
    await expect(page.getByTestId('user-dropdown')).toBeVisible()
  })
})
