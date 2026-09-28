import { createError, type H3Event } from 'h3'
import type { DocsBucket } from '~~/server/types/cloudflare'
import { chunkArray } from '~~/server/utils/d1-limits'
import { secureLog } from '~~/server/utils/secure-logger'
import { DOC_IMAGE_VARIANTS } from '~~/shared/schemas/docs'
import type { DocImageVariant } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export interface StoredImageLocation {
  folderId: string
  documentId: string
  imageId: string
}

const STORAGE_ROOT = 'docs'
const STORAGE_PAGE_SIZE = 1000

export const useDocsBucket = (event: H3Event): DocsBucket => {
  const bucket = event.context.cloudflare?.env?.DOCS_BUCKET

  if (!bucket) {
    throw createError({
      statusCode: 503,
      message: ERROR_KEYS.DOCS_STORAGE_NOT_CONFIGURED,
    })
  }

  return bucket
}

export const getFolderStoragePrefix = (folderId: string): string => `${STORAGE_ROOT}/${folderId}/`

export const getDocumentStoragePrefix = (folderId: string, documentId: string): string =>
  `${getFolderStoragePrefix(folderId)}${documentId}/`

export const getImageStorageKey = ({ folderId, documentId, imageId }: StoredImageLocation, variant: DocImageVariant): string =>
  `${getDocumentStoragePrefix(folderId, documentId)}${imageId}/${variant}`

export const getImageStorageKeys = (location: StoredImageLocation): string[] =>
  DOC_IMAGE_VARIANTS.map(variant => getImageStorageKey(location, variant))

const listStoredKeys = async (bucket: DocsBucket, prefix: string, cursor?: string): Promise<string[]> => {
  const page = await bucket.list({ prefix, cursor, limit: STORAGE_PAGE_SIZE })
  const keys = page.objects.map(object => object.key)

  return page.truncated && page.cursor
    ? [...keys, ...await listStoredKeys(bucket, prefix, page.cursor)]
    : keys
}

const deleteKeys = async (bucket: DocsBucket, keys: readonly string[]): Promise<void> => {
  await Promise.all(chunkArray(keys, STORAGE_PAGE_SIZE).map(chunk => bucket.delete(chunk)))
}

export const deleteStoredImages = async (event: H3Event, locations: readonly StoredImageLocation[]): Promise<void> => {
  try {
    await deleteKeys(useDocsBucket(event), locations.flatMap(getImageStorageKeys))
  }
  catch (error) {
    secureLog.error('Failed to delete stored document images', error)
  }
}

export const deleteStoredPrefixes = async (event: H3Event, prefixes: readonly string[]): Promise<void> => {
  try {
    const bucket = useDocsBucket(event)
    const keys = (await Promise.all(prefixes.map(prefix => listStoredKeys(bucket, prefix)))).flat()
    await deleteKeys(bucket, keys)
  }
  catch (error) {
    secureLog.error('Failed to delete stored document files', error)
  }
}
