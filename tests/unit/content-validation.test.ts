import assert from 'node:assert/strict'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { test } from 'node:test'
import { createEvent } from 'h3'
import contentValidation from '../../server/middleware/content-validation'
import { DOC_UPLOAD_MAX_SIZE } from '../../shared/schemas/docs'
import { ERROR_KEYS } from '../../shared/utils/shared/error-keys'

const UPLOAD_URL = '/api/docs/documents/document-id/images?fileName=page.jpg'

const createRequestEvent = (method: string, url: string, headers: Record<string, string>) => {
  const request = new IncomingMessage(new Socket())
  request.method = method
  request.url = url
  request.headers = headers
  return createEvent(request, new ServerResponse(request))
}

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
