import { test, expect } from '../../fixtures'
import { BASE_URL } from '../../constants'
import { cleanupUserData } from '../../helpers/auth'
import { pressBrowserBack } from '../../helpers/back-navigation'
import { acceptConfirmModal, cancelConfirmModal } from '../../helpers/confirmation'
import { createDocumentThroughApi, createFolderThroughApi, createPngFile, uploadImageThroughApi } from '../../helpers/docs'
import { readClipboardText } from '../../helpers/text'
import { waitForHydration } from '../../helpers/wait-for-hydration'

const DOCUMENT_PAGE_URL = /\/docs\/[^/]+\/[^/]+$/

test.describe('Docs', () => {
  test.afterEach(async ({ request }) => {
    await cleanupUserData(request)
  })

  test('opens the docs page from the header', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await page.getByTestId('docs-btn').click()

    await page.waitForURL('/docs')
    await expect(page.getByTestId('docs-page')).toBeVisible()
    await expect(page.getByTestId('docs-empty-state')).toBeVisible()
  })

  test('creates a folder and opens it', async ({ page }) => {
    await page.goto('/docs')
    await waitForHydration(page)

    await page.getByTestId('docs-add-folder-button').click()
    const modal = page.getByTestId('docs-folder-modal')
    await modal.getByTestId('docs-folder-modal-name-input').fill('Andrew')
    await modal.getByTestId('docs-folder-modal-save-button').click()

    await page.waitForURL(/\/docs\/[^/]+$/)
    await expect(page.getByTestId('docs-folder-title')).toHaveText('Andrew')
    await expect(page.getByTestId('docs-folder-empty-state')).toBeVisible()

    await page.getByTestId('docs-back-to-folders').click()
    await page.waitForURL('/docs')
    await expect(page.getByTestId('docs-folder-card-name')).toHaveText(['Andrew'])
  })

  test('renames and deletes a folder from the list', async ({ page, request }) => {
    await createFolderThroughApi(request, 'Car')
    await page.goto('/docs')
    await waitForHydration(page)

    await page.getByTestId('docs-folder-card-edit-button').click()
    const modal = page.getByTestId('docs-folder-modal')
    await modal.getByTestId('docs-folder-modal-name-input').fill('Family car')
    await modal.getByTestId('docs-folder-modal-save-button').click()

    await expect(modal).not.toBeVisible()
    await expect(page.getByTestId('docs-folder-card-name')).toHaveText(['Family car'])

    await page.getByTestId('docs-folder-card-delete-button').click()
    await acceptConfirmModal(page)

    await expect(page.getByTestId('docs-empty-state')).toBeVisible()
  })

  test('creates a document, fills in its fields and copies them', async ({ page, context, request }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const folder = await createFolderThroughApi(request, 'Andrew')
    await page.goto(`/docs/${folder.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-add-document-button').click()
    const modal = page.getByTestId('docs-document-modal')
    await modal.getByTestId('docs-document-modal-title-input').fill('Passport')
    await modal.getByTestId('docs-document-modal-save-button').click()

    await page.waitForURL(DOCUMENT_PAGE_URL)
    await expect(page.getByTestId('docs-document-title')).toHaveText('Passport')
    await expect(page.getByTestId('docs-document-no-fields')).toBeVisible()

    await page.getByTestId('docs-document-edit-button').click()
    await page.getByTestId('docs-add-field-button').click()
    await page.getByTestId('docs-field-name-input').last().fill('Surname')
    await page.getByTestId('docs-field-value-input').last().fill('Ivanov')
    await page.getByTestId('docs-add-field-button').click()
    await page.getByTestId('docs-field-name-input').last().fill('Number')
    await page.getByTestId('docs-field-value-input').last().fill('45 12 345678')
    await page.getByTestId('docs-document-save-button').click()

    await expect(page.getByTestId('docs-field-value')).toHaveText(['Ivanov', '45 12 345678'])

    await page.getByTestId('docs-field').nth(1).click()
    await expect(page.getByTestId('docs-field-copied')).toBeVisible()
    expect(await readClipboardText(page)).toBe('45 12 345678')

    await page.getByTestId('docs-document-copy-all').click()
    await expect(page.getByTestId('toast-success')).toBeVisible()
    expect(await readClipboardText(page)).toBe('Passport\nSurname: Ivanov\nNumber: 45 12 345678')
  })

  test('does not save a field value without a field name', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport')
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-document-edit-button').click()
    await page.getByTestId('docs-add-field-button').click()
    await page.getByTestId('docs-field-value-input').fill('Ivanov')
    await page.getByTestId('docs-document-save-button').click()

    await expect(page.getByTestId('docs-field-editor-error')).toBeVisible()
    await page.getByTestId('docs-field-name-input').fill('Surname')
    await page.getByTestId('docs-document-save-button').click()

    await expect(page.getByTestId('docs-field-value')).toHaveText(['Ivanov'])
  })

  test('recognizes the fields and the name of a new document from its photos', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    await page.goto(`/docs/${folder.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-add-document-button').click()
    const modal = page.getByTestId('docs-document-modal')
    await modal.getByTestId('docs-document-modal-photos-input').setInputFiles([
      createPngFile('page-1.png'),
      createPngFile('page-2.png', [220, 38, 38]),
    ])
    await expect(modal.getByTestId('docs-document-modal-recognize-checkbox')).toBeChecked()
    await modal.getByTestId('docs-document-modal-save-button').click()

    await page.waitForURL(DOCUMENT_PAGE_URL)
    await expect(page.getByTestId('docs-photo')).toHaveCount(2)
    await expect(page.getByTestId('docs-document-title')).toHaveText('Test document')
    await expect(page.getByTestId('docs-field-name')).toHaveText(['Test mode', 'Photos read'])
    await expect(page.getByTestId('docs-field-value').nth(1)).toHaveText('2')
    await expect(page.getByTestId('docs-activity-status')).not.toBeVisible()
  })

  test('adds photos without recognition and keeps the fields', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Insurance', [{ name: 'Number', value: '123-456-789 01' }])
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-add-photos-button').click()
    const modal = page.getByTestId('docs-photos-modal')
    await modal.getByTestId('docs-photos-modal-input').setInputFiles([createPngFile('front.png')])
    await modal.getByTestId('docs-photos-modal-recognize-checkbox').uncheck()
    await modal.getByTestId('docs-photos-modal-save-button').click()

    await expect(page.getByTestId('docs-photo')).toHaveCount(1)
    await expect(page.getByTestId('docs-activity-status')).not.toBeVisible()
    await expect(page.getByTestId('docs-field-value')).toHaveText(['123-456-789 01'])
  })

  test('reports a file the browser cannot read', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport')
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-add-photos-button').click()
    const modal = page.getByTestId('docs-photos-modal')
    await modal.getByTestId('docs-photos-modal-input').setInputFiles([{ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') }])
    await modal.getByTestId('docs-photos-modal-save-button').click()

    await expect(page.getByTestId('toast-error')).toBeVisible()
    await expect(page.getByTestId('docs-activity-status')).not.toBeVisible()
    await expect(page.getByTestId('docs-photo')).toHaveCount(0)
  })

  test('adds recognized fields to the fields the user already has', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport', [{ name: 'Surname', value: 'Ivanov' }])
    await uploadImageThroughApi(request, document.id, 'page-1.png')
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-recognize-menu-button').click()
    await page.getByTestId('docs-recognize-add-new').click()

    await expect(page.getByTestId('docs-field-name')).toHaveText(['Test mode', 'Photos read', 'Surname'])
    await expect(page.getByTestId('docs-document-title')).toHaveText('Passport')
  })

  test('replaces the fields after confirmation', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport', [{ name: 'Surname', value: 'Ivanov' }])
    await uploadImageThroughApi(request, document.id, 'page-1.png')
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-recognize-menu-button').click()
    await page.getByTestId('docs-recognize-replace').click()
    await acceptConfirmModal(page)

    await expect(page.getByTestId('docs-field-name')).toHaveText(['Test mode', 'Photos read'])
  })

  test('remembers the chosen recognition effort and sends it with the request', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport')
    await uploadImageThroughApi(request, document.id, 'page-1.png')
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    const effortSelect = page.getByTestId('docs-recognize-effort-select')
    await expect(effortSelect).toHaveValue('low')
    await effortSelect.selectOption('high')

    await page.reload()
    await waitForHydration(page)
    await expect(effortSelect).toHaveValue('high')

    const recognizeRequest = page.waitForRequest(sentRequest =>
      sentRequest.method() === 'POST' && sentRequest.url().endsWith(`/api/docs/documents/${document.id}/recognize`))
    await page.getByTestId('docs-recognize-button').click()
    expect((await recognizeRequest).postDataJSON()).toEqual({ mode: 'merge', effort: 'high' })
    await expect(page.getByTestId('docs-field-name')).toHaveText(['Test mode', 'Photos read'])

    await page.getByTestId('docs-add-photos-button').click()
    const modal = page.getByTestId('docs-photos-modal')
    await modal.getByTestId('docs-photos-modal-input').setInputFiles([createPngFile('back.png')])
    await expect(modal.getByTestId('docs-recognition-option-effort-select')).toHaveValue('high')
  })

  test('shows photos in the viewer, switches between them and deletes one', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport')
    const { imageId: firstImageId } = await uploadImageThroughApi(request, document.id, 'page-1.png')
    const { imageId: secondImageId } = await uploadImageThroughApi(request, document.id, 'page-2.png')
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-photo-open').first().click()
    const viewer = page.getByTestId('docs-photo-viewer')
    const image = viewer.getByTestId('docs-photo-viewer-image')
    await expect(image).toHaveAttribute('src', `/api/docs/images/${firstImageId}/original`)
    await expect(viewer.getByTestId('docs-photo-viewer-download')).toHaveAttribute('href', `/api/docs/images/${firstImageId}/original?download=1`)

    await viewer.getByTestId('docs-photo-viewer-next').click()
    await expect(image).toHaveAttribute('src', `/api/docs/images/${secondImageId}/original`)

    await viewer.getByTestId('docs-photo-viewer-delete').click()
    await acceptConfirmModal(page)

    await expect(image).toHaveAttribute('src', `/api/docs/images/${firstImageId}/original`)
    await viewer.getByTestId('docs-photo-viewer-close').click()
    await expect(viewer).not.toBeVisible()
    await expect(page.getByTestId('docs-photo')).toHaveCount(1)
  })

  test('serves the original photo only to users with access', async ({ request, browser }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport')
    const { imageId } = await uploadImageThroughApi(request, document.id, 'page-1.png')

    const response = await request.get(`${BASE_URL}/api/docs/images/${imageId}/original?download=1`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('image/png')
    expect(response.headers()['content-disposition']).toContain('attachment')
    expect((await response.body()).subarray(1, 4).toString('ascii')).toBe('PNG')
    expect(response.headers()['cache-control']).toBe('private, no-cache')
    expect(response.headers()['x-content-type-options']).toBe('nosniff')

    const etag = response.headers()['etag']
    expect(etag).toBeTruthy()
    const revalidated = await request.get(`${BASE_URL}/api/docs/images/${imageId}/original`, { headers: { 'if-none-match': etag ?? '' } })
    expect(revalidated.status()).toBe(304)

    const anonymousContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const anonymousResponse = await anonymousContext.request.get(`${BASE_URL}/api/docs/images/${imageId}/original`)
    expect(anonymousResponse.status()).toBe(401)
    await anonymousContext.close()
  })

  test('moves photos in edit mode', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport')
    const { imageId: firstImageId } = await uploadImageThroughApi(request, document.id, 'page-1.png')
    const { imageId: secondImageId } = await uploadImageThroughApi(request, document.id, 'page-2.png')
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-document-edit-button').click()
    await page.getByTestId('docs-photo-move-forward').first().click()

    const photos = page.getByTestId('docs-photo').locator('img')
    await expect(photos.first()).toHaveAttribute('src', `/api/docs/images/${secondImageId}/thumbnail`)
    await expect(photos.last()).toHaveAttribute('src', `/api/docs/images/${firstImageId}/thumbnail`)
  })

  test('copies the hidden fields from a document card and opens the document from anywhere on it', async ({ page, context, request }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport', [
      { name: 'Surname', value: 'Ivanov' },
      { name: 'Number', value: '45 12 345678' },
    ])
    await page.goto(`/docs/${folder.id}`)
    await waitForHydration(page)

    const card = page.getByTestId('docs-document-card')
    await expect(card.getByTestId('docs-document-card-title')).toHaveText('Passport')
    await expect(card.getByTestId('docs-field')).toHaveCount(0)

    await card.getByTestId('docs-document-card-copy-all').click()
    await expect(page.getByTestId('toast-success')).toBeVisible()
    expect(await readClipboardText(page)).toBe('Passport\nSurname: Ivanov\nNumber: 45 12 345678')
    await expect(page).toHaveURL(`/docs/${folder.id}`)

    await card.click({ position: { x: 8, y: 8 } })
    await page.waitForURL(`/docs/${folder.id}/${document.id}`)
    await expect(page.getByTestId('docs-field-value')).toHaveText(['Ivanov', '45 12 345678'])
  })

  test('deletes a document and returns to its folder', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport')
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await page.getByTestId('docs-document-delete-button').click()
    await acceptConfirmModal(page)

    await page.waitForURL(`/docs/${folder.id}`)
    await expect(page.getByTestId('docs-folder-empty-state')).toBeVisible()
  })

  test('leaves the edit mode on browser back and asks before dropping changes', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport', [{ name: 'Surname', value: 'Ivanov' }])
    await page.goto(`/docs/${folder.id}`)
    await waitForHydration(page)
    await page.getByTestId('docs-document-card-title').click()
    await page.waitForURL(`/docs/${folder.id}/${document.id}`)

    await page.getByTestId('docs-document-edit-button').click()
    await page.getByTestId('docs-field-value-input').fill('Petrov')

    await pressBrowserBack(page)
    await expect(page.getByTestId('confirmation-modal')).toBeVisible()
    await acceptConfirmModal(page)

    await expect(page.getByTestId('docs-field-editor')).not.toBeVisible()
    await expect(page).toHaveURL(`/docs/${folder.id}/${document.id}`)
    await expect(page.getByTestId('docs-field-value')).toHaveText(['Ivanov'])
  })

  test('asks before a link drops the changes made in edit mode', async ({ page, request }) => {
    const folder = await createFolderThroughApi(request, 'Andrew')
    const document = await createDocumentThroughApi(request, folder.id, 'Passport', [{ name: 'Surname', value: 'Ivanov' }])
    await page.goto(`/docs/${folder.id}/${document.id}`)
    await waitForHydration(page)

    await expect(page.getByTestId('docs-add-photos-button')).toBeVisible()
    await page.getByTestId('docs-document-edit-button').click()
    await expect(page.getByTestId('docs-add-photos-button')).not.toBeVisible()
    await page.getByTestId('docs-field-value-input').fill('Petrov')

    await page.getByTestId('docs-back-to-folder').click()
    await cancelConfirmModal(page)

    await expect(page).toHaveURL(`/docs/${folder.id}/${document.id}`)
    await expect(page.getByTestId('docs-field-value-input')).toHaveValue('Petrov')

    await page.getByTestId('docs-back-to-folder').click()
    await acceptConfirmModal(page)

    await page.waitForURL(`/docs/${folder.id}`)
    await page.getByTestId('docs-document-card-title').click()
    await page.waitForURL(`/docs/${folder.id}/${document.id}`)
    await expect(page.getByTestId('docs-field-value')).toHaveText(['Ivanov'])
  })

  test('shows a message for a folder that does not exist', async ({ page }) => {
    await page.goto('/docs/missing-folder')
    await waitForHydration(page)

    await expect(page.getByTestId('docs-folder-error')).toBeVisible()
  })
})
