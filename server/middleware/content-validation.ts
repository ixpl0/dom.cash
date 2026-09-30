import { defineEventHandler, getHeaders, createError } from 'h3'
import { getMediaType, getRoutePath, isWriteRequest } from '~~/server/utils/request'
import { DOC_UPLOAD_MAX_SIZE } from '~~/shared/schemas/docs'
import { ERROR_KEYS, type ErrorKey } from '~~/shared/utils/shared/error-keys'

interface UploadRoute {
  method: string
  path: RegExp
  contentType: string
  maxSize: number
  contentTypeErrorKey: ErrorKey
  sizeErrorKey: ErrorKey
}

const MAX_REQUEST_SIZE = 1 * 1024 * 1024

const JSON_CONTENT_TYPE = 'application/json'

const NO_BODY_ENDPOINTS: readonly string[] = [
  '/api/auth/logout',
]

const UPLOAD_ROUTES: readonly UploadRoute[] = [
  {
    method: 'POST',
    path: /^\/api\/docs\/documents\/[^/]+\/images$/,
    contentType: 'application/octet-stream',
    maxSize: DOC_UPLOAD_MAX_SIZE,
    contentTypeErrorKey: ERROR_KEYS.DOCS_INVALID_UPLOAD,
    sizeErrorKey: ERROR_KEYS.DOCS_IMAGE_TOO_LARGE,
  },
]

const validateUpload = (uploadRoute: UploadRoute, contentType: string, contentLength: string | undefined): void => {
  if (contentType !== uploadRoute.contentType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: uploadRoute.contentTypeErrorKey,
    })
  }

  if (contentLength && parseInt(contentLength) > uploadRoute.maxSize) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large',
      message: uploadRoute.sizeErrorKey,
    })
  }
}

export default defineEventHandler(async (event) => {
  const path = getRoutePath(event)

  if (!isWriteRequest(event) || !path.startsWith('/api/')) {
    return
  }

  const headers = getHeaders(event)
  const contentType = getMediaType(headers['content-type'])
  const contentLength = headers['content-length']
  const uploadRoute = UPLOAD_ROUTES.find(route => route.method === event.method && route.path.test(path))

  if (uploadRoute) {
    validateUpload(uploadRoute, contentType, contentLength)
    return
  }

  const isDeleteRequest = event.method === 'DELETE'
  const isNoBodyEndpoint = NO_BODY_ENDPOINTS.includes(path)

  if (!isDeleteRequest && !isNoBodyEndpoint) {
    if (contentLength && parseInt(contentLength) > 0) {
      if (contentType !== JSON_CONTENT_TYPE) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: ERROR_KEYS.CONTENT_TYPE_REQUIRED,
        })
      }
    }
  }

  if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large',
      message: ERROR_KEYS.PAYLOAD_TOO_LARGE,
    })
  }
})
