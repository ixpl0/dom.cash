import { expect, type Page } from '@playwright/test'

export const acceptConfirmModal = async (page: Page): Promise<void> => {
  const confirmModal = page.getByTestId('confirmation-modal')
  await expect(confirmModal).toBeVisible()

  const confirmButton = confirmModal.getByTestId('confirmation-confirm-button')
  await confirmButton.click()
}

export const cancelConfirmModal = async (page: Page): Promise<void> => {
  const confirmModal = page.getByTestId('confirmation-modal')
  await expect(confirmModal).toBeVisible()

  const cancelButton = confirmModal.getByTestId('confirmation-cancel-button')
  await cancelButton.click()
}
