import assert from 'node:assert/strict'
import { test } from 'node:test'
import contentValidation from '../../server/middleware/content-validation'
import { DOC_UPLOAD_MAX_SIZE } from '../../shared/schemas/docs'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'
import { createRequestEvent, routeThrough } from './helpers/request-event'

const UPLOAD_URL = '/api/docs/documents/document-id/images?fileName=page.jpg'

test('a photo upload may send a binary body larger than a JSON request', async () => {
  const event = createRequestEvent('POST', UPLOAD_URL, {
    'content-type': 'application/octet-stream',
    'content-length': String(5 * 1024 * 1024),
  })

  assert.equal(await contentValidation(event), undefined)
})

test('a photo upload must be sent as binary data', async () => {
  const event = createRequestEvent('POST', UPLOAD_URL, {
    'content-type': 'application/json',
    'content-length': '10',
  })

  await assert.rejects(Promise.resolve(contentValidation(event)), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_INVALID_UPLOAD,
  })
})

test('a photo upload above the limit is refused before it is read', async () => {
  const event = createRequestEvent('POST', UPLOAD_URL, {
    'content-type': 'application/octet-stream',
    'content-length': String(DOC_UPLOAD_MAX_SIZE + 1),
  })

  await assert.rejects(Promise.resolve(contentValidation(event)), {
    statusCode: 413,
    message: ERROR_KEYS.DOCS_IMAGE_TOO_LARGE,
  })
})

test('other routes still accept only JSON bodies', async () => {
  const event = createRequestEvent('POST', '/api/docs/folders', {
    'content-type': 'application/octet-stream',
    'content-length': '10',
  })

  await assert.rejects(Promise.resolve(contentValidation(event)), {
    statusCode: 400,
    message: ERROR_KEYS.CONTENT_TYPE_REQUIRED,
  })
})

test('a binary body is refused on routes that look like the upload route', async () => {
  const event = createRequestEvent('POST', '/api/docs/documents/document-id/images/order', {
    'content-type': 'application/octet-stream',
    'content-length': '10',
  })

  await assert.rejects(Promise.resolve(contentValidation(event)), {
    statusCode: 400,
    message: ERROR_KEYS.CONTENT_TYPE_REQUIRED,
  })
})

test('a JSON body may name its charset', async () => {
  const event = createRequestEvent('POST', '/api/docs/folders', {
    'content-type': 'Application/JSON; charset=utf-8',
    'content-length': '10',
  })

  assert.equal(await contentValidation(event), undefined)
})

const disguisedTypes = [
  'multipart/form-data;application/json',
  'text/plain;application/json',
  'application/x-www-form-urlencoded; boundary=application/json',
]

disguisedTypes.forEach((contentType) => {
  test(`a body sent as ${contentType} is not taken for JSON`, async () => {
    const event = createRequestEvent('POST', '/api/budget/shares', {
      'content-type': contentType,
      'content-length': '10',
    })

    await assert.rejects(Promise.resolve(contentValidation(event)), {
      statusCode: 400,
      message: ERROR_KEYS.CONTENT_TYPE_REQUIRED,
    })
  })
})

test('a body that only mentions binary data is not taken for a photo upload', async () => {
  const event = createRequestEvent('POST', UPLOAD_URL, {
    'content-type': 'text/plain;application/octet-stream',
    'content-length': '10',
  })

  await assert.rejects(Promise.resolve(contentValidation(event)), {
    statusCode: 400,
    message: ERROR_KEYS.DOCS_INVALID_UPLOAD,
  })
})

test('a percent-encoded path gets the same checks as the route it reaches', async () => {
  const event = createRequestEvent('POST', '/%61pi/budget/shares', {
    'content-type': 'text/plain',
    'content-length': '10',
  })

  await assert.rejects(routeThrough(contentValidation, event), {
    statusCode: 400,
    message: ERROR_KEYS.CONTENT_TYPE_REQUIRED,
  })
})

test('a JSON request reaches its route with the decoded path', async () => {
  const event = createRequestEvent('POST', '/%61pi/budget/shares?username=a%40b.c', {
    'content-type': 'application/json',
    'content-length': '10',
  })

  assert.equal(await routeThrough(contentValidation, event), '/api/budget/shares?username=a%40b.c')
})
