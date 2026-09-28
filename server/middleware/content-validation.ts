import { defineEventHandler, getMethod, getHeaders, createError } from 'h3'
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

const validateUpload = (uploadRoute: UploadRoute, contentType: string | undefined, contentLength: string | undefined): void => {
  if (!contentType || !contentType.includes(uploadRoute.contentType)) {
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
  const method = getMethod(event)
  const url = event.node.req.url || ''

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && url.startsWith('/api/')) {
    const headers = getHeaders(event)
    const contentType = headers['content-type']
    const contentLength = headers['content-length']
    const path = url.split('?')[0] ?? ''
    const uploadRoute = UPLOAD_ROUTES.find(route => route.method === method && route.path.test(path))

    if (uploadRoute) {
      validateUpload(uploadRoute, contentType, contentLength)
      return
    }

    const noBodyEndpoints = [
      '/api/auth/logout',
    ]

    const isDeleteRequest = method === 'DELETE'
    const isNoBodyEndpoint = noBodyEndpoints.includes(url)

    if (!isDeleteRequest && !isNoBodyEndpoint) {
      if (contentLength && parseInt(contentLength) > 0) {
        if (!contentType || !contentType.includes('application/json')) {
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
  }
})
