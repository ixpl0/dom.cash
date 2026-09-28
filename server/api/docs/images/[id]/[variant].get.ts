import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { requireRouterParam } from '~~/server/utils/route-params'
import { parseQuery, validateInput } from '~~/server/utils/validation'
import { readImage } from '~~/server/services/docs/images'
import { docImageVariantSchema } from '~~/shared/schemas/docs'
import type { DocImageVariant } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const querySchema = z.object({
  download: z.literal('1').optional(),
})

const IMMUTABLE_CACHE_CONTROL = 'private, max-age=31536000, immutable'
const GENERATED_IMAGE_TYPE = 'image/jpeg'

const toAsciiFileName = (fileName: string): string => fileName.replace(/[^\x20-\x7E]|["\\]/g, '_')

const encodeFileName = (fileName: string): string =>
  encodeURIComponent(fileName).replace(/['()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)

const getVariantFileName = (fileName: string, variant: DocImageVariant): string =>
  variant === 'original' ? fileName : `${fileName.replace(/\.[^.]+$/, '')}-${variant}.jpg`

const buildContentDisposition = (fileName: string, isDownload: boolean): string =>
  `${isDownload ? 'attachment' : 'inline'}; filename="${toAsciiFileName(fileName)}"; filename*=UTF-8''${encodeFileName(fileName)}`

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
  const imageId = requireRouterParam(event, 'id', ERROR_KEYS.DOCS_ID_REQUIRED)
  const variant = validateInput(getRouterParam(event, 'variant'), docImageVariantSchema, ERROR_KEYS.DOCS_IMAGE_NOT_FOUND)
  const { download } = parseQuery(event, querySchema)
  const { object, imageRow } = await readImage(currentUser.id, imageId, variant, event)

  return new Response(object.body, {
    headers: {
      'Content-Type': variant === 'original' ? imageRow.contentType : GENERATED_IMAGE_TYPE,
      'Content-Length': String(object.size),
      'Cache-Control': IMMUTABLE_CACHE_CONTROL,
      'ETag': object.httpEtag,
      'Content-Disposition': buildContentDisposition(getVariantFileName(imageRow.fileName, variant), download === '1'),
    },
  })
})
