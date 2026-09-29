import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { parseQuery, validateInput } from '~~/server/utils/validation'
import { findReadableImage } from '~~/server/services/docs/access'
import { readStoredImage } from '~~/server/services/docs/images'
import { docImageVariantSchema } from '~~/shared/schemas/docs'
import type { DocImageVariant } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const querySchema = z.object({
  download: z.literal('1').optional(),
})

const REVALIDATE_CACHE_CONTROL = 'private, no-cache'
const GENERATED_IMAGE_TYPE = 'image/jpeg'

const toAsciiFileName = (fileName: string): string => fileName.replace(/[^\x20-\x7E]|["\\]/g, '_')

const encodeFileName = (fileName: string): string =>
  encodeURIComponent(fileName).replace(/['()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)

const getVariantFileName = (fileName: string, variant: DocImageVariant): string =>
  variant === 'original' ? fileName : `${fileName.replace(/\.[^.]+$/, '')}-${variant}.jpg`

const buildContentDisposition = (fileName: string, isDownload: boolean): string =>
  `${isDownload ? 'attachment' : 'inline'}; filename="${toAsciiFileName(fileName)}"; filename*=UTF-8''${encodeFileName(fileName)}`

const hasMatchingEtag = (ifNoneMatch: string | undefined, etag: string): boolean =>
  ifNoneMatch !== undefined && ifNoneMatch.split(',').some(tag => tag.trim().replace(/^W\//, '') === etag)

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const imageId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  const variant = validateInput(getRouterParam(event, 'variant'), docImageVariantSchema, ERROR_KEYS.DOCS_IMAGE_NOT_FOUND)
  const { download } = parseQuery(event, querySchema)
  const readableImage = await findReadableImage(imageId, currentUser.id, event)
  const cacheHeaders = {
    'Cache-Control': REVALIDATE_CACHE_CONTROL,
    'ETag': `"${readableImage.imageRow.id}-${variant}"`,
    'X-Content-Type-Options': 'nosniff',
  }

  if (hasMatchingEtag(getRequestHeader(event, 'if-none-match'), cacheHeaders.ETag)) {
    return new Response(null, { status: 304, headers: cacheHeaders })
  }

  const object = await readStoredImage(event, readableImage, variant)

  return new Response(object.body, {
    headers: {
      ...cacheHeaders,
      'Content-Type': variant === 'original' ? readableImage.imageRow.contentType : GENERATED_IMAGE_TYPE,
      'Content-Length': String(object.size),
      'Content-Disposition': buildContentDisposition(getVariantFileName(readableImage.imageRow.fileName, variant), download === '1'),
    },
  })
})
