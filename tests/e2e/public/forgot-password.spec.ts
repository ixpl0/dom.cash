import { test, expect } from '@playwright/test'
import { INPUT_LIMITS, DEV_VERIFICATION_CODE } from '../constants'
import { waitForHydration } from '../helpers/wait-for-hydration'

test.describe('Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth')
    await waitForHydration(page)
  })

  test('forgot password link is visible and clickable', async ({ page }) => {
    const forgotPasswordLink = page.getByTestId('forgot-password-link')
    await expect(forgotPasswordLink).toBeVisible()
    await forgotPasswordLink.click()
    await expect(page.getByTestId('forgot-password-form')).toBeVisible()
  })

  test('forgot password form displays correctly', async ({ page }) => {
    await page.getByTestId('forgot-password-link').click()

    await expect(page.getByTestId('forgot-password-form')).toBeVisible()
    await expect(page.getByTestId('forgot-password-email-input')).toBeVisible()
    await expect(page.getByTestId('send-reset-code-btn')).toBeVisible()
    await expect(page.getByTestId('back-to-login-btn')).toBeVisible()
  })

  test('back to login button returns to login form', async ({ page }) => {
    await page.getByTestId('forgot-password-link').click()
    await expect(page.getByTestId('forgot-password-form')).toBeVisible()

    await page.getByTestId('back-to-login-btn').click()

    await expect(page.getByTestId('forgot-password-form')).not.toBeVisible()
    await expect(page.getByTestId('email-input')).toBeVisible()
    await expect(page.getByTestId('password-input')).toBeVisible()
  })

  test('forgot password email input has correct attributes', async ({ page }) => {
    await page.getByTestId('forgot-password-link').click()

    const emailInput = page.getByTestId('forgot-password-email-input')
    await expect(emailInput).toHaveAttribute('minlength', INPUT_LIMITS.USERNAME_MIN.toString())
    await expect(emailInput).toHaveAttribute('maxlength', INPUT_LIMITS.USERNAME_MAX.toString())
    await expect(emailInput).toHaveAttribute('required', '')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')
  })

  test('preserves email from login form when switching to forgot password', async ({ page }) => {
    const testEmail = 'test@example.com'
    await page.getByTestId('email-input').fill(testEmail)

    await page.getByTestId('forgot-password-link').click()

    const forgotPasswordEmailInput = page.getByTestId('forgot-password-email-input')
    await expect(forgotPasswordEmailInput).toHaveValue(testEmail)
  })

  test('sends reset code for existing user and shows step 2', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(testPassword)
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()
    await page.waitForURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()
    await page.getByTestId('logout-btn').click()
    await page.waitForURL('/')

    await page.goto('/auth')
    await waitForHydration(page)
    await page.getByTestId('forgot-password-link').click()

    await page.getByTestId('forgot-password-email-input').fill(testUsername)
    await page.getByTestId('send-reset-code-btn').click()

    await expect(page.getByTestId('reset-code-input')).toBeVisible()
    await expect(page.getByTestId('new-password-input')).toBeVisible()
    await expect(page.getByTestId('reset-password-btn')).toBeVisible()
  })

  test('reset password step 2 has correct input attributes', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(testPassword)
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()
    await page.waitForURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()
    await page.getByTestId('logout-btn').click()
    await page.waitForURL('/')

    await page.goto('/auth')
    await waitForHydration(page)
    await page.getByTestId('forgot-password-link').click()
    await page.getByTestId('forgot-password-email-input').fill(testUsername)
    await page.getByTestId('send-reset-code-btn').click()

    await expect(page.getByTestId('reset-code-input')).toBeVisible()

    const newPasswordInput = page.getByTestId('new-password-input')
    await expect(newPasswordInput).toHaveAttribute('minlength', INPUT_LIMITS.PASSWORD_MIN.toString())
    await expect(newPasswordInput).toHaveAttribute('maxlength', INPUT_LIMITS.PASSWORD_MAX.toString())
    await expect(newPasswordInput).toHaveAttribute('required', '')
    await expect(newPasswordInput).toHaveAttribute('type', 'password')
    await expect(newPasswordInput).toHaveAttribute('autocomplete', 'new-password')

    const resetCodeInput = page.getByTestId('reset-code-input')
    await expect(resetCodeInput).toHaveAttribute('maxlength', '6')
    await expect(resetCodeInput).toHaveAttribute('required', '')
  })

  test('back to login from step 2 returns to login form', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(testPassword)
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()
    await page.waitForURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()
    await page.getByTestId('logout-btn').click()
    await page.waitForURL('/')

    await page.goto('/auth')
    await waitForHydration(page)
    await page.getByTestId('forgot-password-link').click()
    await page.getByTestId('forgot-password-email-input').fill(testUsername)
    await page.getByTestId('send-reset-code-btn').click()

    await expect(page.getByTestId('reset-code-input')).toBeVisible()
    await page.getByTestId('back-to-login-from-reset-btn').click()

    await expect(page.getByTestId('forgot-password-form')).not.toBeVisible()
    await expect(page.getByTestId('email-input')).toBeVisible()
    await expect(page.getByTestId('password-input')).toBeVisible()
  })

  test('successfully resets password and can login with new password', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const originalPassword = 'TestPassword123!'
    const newPassword = 'NewPassword456!'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(originalPassword)
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()
    await page.waitForURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()
    await page.getByTestId('logout-btn').click()
    await page.waitForURL('/')

    await page.goto('/auth')
    await waitForHydration(page)
    await page.getByTestId('forgot-password-link').click()

    await page.getByTestId('forgot-password-email-input').fill(testUsername)
    await page.getByTestId('send-reset-code-btn').click()

    await expect(page.getByTestId('reset-code-input')).toBeVisible()
    await page.getByTestId('reset-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('new-password-input').fill(newPassword)
    await page.getByTestId('reset-password-btn').click()

    await expect(page.getByTestId('email-input')).toBeVisible()

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(newPassword)
    await page.getByTestId('login-btn').click()

    await page.waitForURL('/')
    await expect(page.getByTestId('user-dropdown')).toBeVisible()
  })

  test('cannot login with old password after reset', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const originalPassword = 'TestPassword123!'
    const newPassword = 'NewPassword456!'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(originalPassword)
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()
    await page.waitForURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()
    await page.getByTestId('logout-btn').click()
    await page.waitForURL('/')

    await page.goto('/auth')
    await waitForHydration(page)
    await page.getByTestId('forgot-password-link').click()
    await page.getByTestId('forgot-password-email-input').fill(testUsername)
    await page.getByTestId('send-reset-code-btn').click()

    await expect(page.getByTestId('reset-code-input')).toBeVisible()
    await page.getByTestId('reset-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('new-password-input').fill(newPassword)
    await page.getByTestId('reset-password-btn').click()

    await expect(page.getByTestId('email-input')).toBeVisible()

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(originalPassword)
    await page.getByTestId('login-btn').click()

    await expect(page).toHaveURL('/auth')
  })

  test('blocks password reset after 3 failed code attempts', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    const wrongCode = '000000'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(testPassword)
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()
    await page.waitForURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()
    await page.getByTestId('logout-btn').click()
    await page.waitForURL('/')

    await page.goto('/auth')
    await waitForHydration(page)
    await page.getByTestId('forgot-password-link').click()
    await page.getByTestId('forgot-password-email-input').fill(testUsername)
    await page.getByTestId('send-reset-code-btn').click()

    await expect(page.getByTestId('reset-code-input')).toBeVisible()

    for (let i = 0; i < 3; i++) {
      await page.getByTestId('reset-code-input').fill(wrongCode)
      await page.getByTestId('new-password-input').fill('NewPassword123!')
      await page.getByTestId('reset-password-btn').click()
      await page.waitForTimeout(500)
    }

    await expect(page.getByTestId('auth-error')).toBeVisible()
    const errorText = await page.getByTestId('auth-error').textContent()
    expect(errorText).toContain('Too many failed attempts')
  })

  test('password reset works after failed attempts within limit', async ({ page }) => {
    const testUsername = `test_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    const newPassword = 'NewPassword456!'
    const wrongCode = '000000'

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(testPassword)
    await page.getByTestId('register-btn').click()
    await page.getByTestId('verification-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('verify-code-btn').click()
    await page.waitForURL('/')

    const userDropdown = page.getByTestId('user-dropdown')
    await userDropdown.click()
    await page.getByTestId('logout-btn').click()
    await page.waitForURL('/')

    await page.goto('/auth')
    await waitForHydration(page)
    await page.getByTestId('forgot-password-link').click()
    await page.getByTestId('forgot-password-email-input').fill(testUsername)
    await page.getByTestId('send-reset-code-btn').click()

    await expect(page.getByTestId('reset-code-input')).toBeVisible()

    await page.getByTestId('reset-code-input').fill(wrongCode)
    await page.getByTestId('new-password-input').fill(newPassword)
    await page.getByTestId('reset-password-btn').click()
    await page.waitForTimeout(500)

    await page.getByTestId('reset-code-input').fill(wrongCode)
    await page.getByTestId('new-password-input').fill(newPassword)
    await page.getByTestId('reset-password-btn').click()
    await page.waitForTimeout(500)

    await page.getByTestId('reset-code-input').fill(DEV_VERIFICATION_CODE)
    await page.getByTestId('new-password-input').fill(newPassword)
    await page.getByTestId('reset-password-btn').click()

    await expect(page.getByTestId('email-input')).toBeVisible()

    await page.getByTestId('email-input').fill(testUsername)
    await page.getByTestId('password-input').fill(newPassword)
    await page.getByTestId('login-btn').click()

    await page.waitForURL('/')
    await expect(page.getByTestId('user-dropdown')).toBeVisible()
  })
})
