import { and, count, eq, sql } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { docDocument, docImage } from '~~/server/db/schema'
import { getDocumentAccess, getImageAccess, getParticipantIds, type DocDocumentAccess, type ReadableDocImage } from '~~/server/services/docs/access'
import { loadDocument } from '~~/server/services/docs/documents'
import { notifyDocsParticipants } from '~~/server/services/docs/notifications'
import type { RecognitionImageReader } from '~~/server/services/docs/recognizer'
import { deleteStoredImages, getImageStorageKey, useDocsBucket, type StoredImageLocation } from '~~/server/services/docs/storage'
import type { DocsBucketObjectBody } from '~~/server/types/cloudflare'
import { detectImageContentType } from '~~/server/utils/image-type'
import { secureLog } from '~~/server/utils/secure-logger'
import { DOC_MAX_IMAGES } from '~~/shared/schemas/docs'
import type { User } from '~~/shared/types'
import type { DocDocument, DocImageUploadResult, DocImageVariant, UploadDocImageQuery } from '~~/shared/types/docs'
import { sanitizeFileName } from '~~/shared/utils/docs'
import { ERROR_KEYS, type ErrorKey } from '~~/shared/utils/shared/error-keys'

interface UploadParts {
  original: Uint8Array
  preview: Uint8Array
  thumbnail: Uint8Array
}

const GENERATED_IMAGE_TYPE = 'image/jpeg'

const invalidUpload = (message: ErrorKey = ERROR_KEYS.DOCS_INVALID_UPLOAD) =>
  createError({ statusCode: 400, message })

const splitUpload = (body: Uint8Array, { originalSize, previewSize, thumbnailSize }: UploadDocImageQuery): UploadParts => {
  if (body.byteLength !== originalSize + previewSize + thumbnailSize) {
    throw invalidUpload()
  }

  return {
    original: body.subarray(0, originalSize),
    preview: body.subarray(originalSize, originalSize + previewSize),
    thumbnail: body.subarray(originalSize + previewSize),
  }
}

const notifyImagesChanged = (event: H3Event, actor: User, access: DocDocumentAccess, documentTitle: string): Promise<void> =>
  notifyDocsParticipants(event, actor, {
    ownerId: access.folderRow.userId,
    recipientIds: getParticipantIds(access),
    type: 'docs_images_changed',
    params: { folderName: access.folderRow.name, documentTitle },
  })

const storeUploadParts = async (event: H3Event, location: StoredImageLocation, contentType: string, parts: UploadParts): Promise<void> => {
  const bucket = useDocsBucket(event)

  try {
    await Promise.all([
      bucket.put(getImageStorageKey(location, 'original'), parts.original, { httpMetadata: { contentType } }),
      bucket.put(getImageStorageKey(location, 'preview'), parts.preview, { httpMetadata: { contentType: GENERATED_IMAGE_TYPE } }),
      bucket.put(getImageStorageKey(location, 'thumbnail'), parts.thumbnail, { httpMetadata: { contentType: GENERATED_IMAGE_TYPE } }),
    ])
  }
  catch (error) {
    secureLog.error('Failed to store a document image', error)
    await deleteStoredImages(event, [location])
    throw createError({
      statusCode: 502,
      message: ERROR_KEYS.DOCS_STORAGE_FAILED,
    })
  }
}

export const addImage = async (
  actor: User,
  documentId: string,
  query: UploadDocImageQuery,
  body: Uint8Array,
  event: H3Event,
): Promise<DocImageUploadResult> => {
  const access = await getDocumentAccess(documentId, actor.id, event)
  const db = useDatabase(event)
  const [imageCount] = await db
    .select({ total: count() })
    .from(docImage)
    .where(eq(docImage.documentId, documentId))

  if ((imageCount?.total ?? 0) >= DOC_MAX_IMAGES) {
    throw invalidUpload(ERROR_KEYS.DOCS_TOO_MANY_IMAGES)
  }

  const parts = splitUpload(body, query)
  const contentType = detectImageContentType(parts.original)
  const hasGeneratedImages = detectImageContentType(parts.preview) === GENERATED_IMAGE_TYPE
    && detectImageContentType(parts.thumbnail) === GENERATED_IMAGE_TYPE

  if (!contentType || !hasGeneratedImages) {
    throw invalidUpload(ERROR_KEYS.DOCS_UNSUPPORTED_IMAGE)
  }

  const location: StoredImageLocation = { folderId: access.folderRow.id, documentId, imageId: crypto.randomUUID() }
  await storeUploadParts(event, location, contentType, parts)

  const now = new Date()

  try {
    await db.batch([
      db.insert(docImage).values({
        id: location.imageId,
        documentId,
        position: sql`(SELECT COALESCE(MAX(${docImage.position}), -1) + 1 FROM ${docImage} WHERE ${docImage.documentId} = ${documentId})`,
        fileName: sanitizeFileName(query.fileName),
        contentType,
        size: parts.original.byteLength,
        storedSize: body.byteLength,
        width: query.width ?? null,
        height: query.height ?? null,
        createdAt: now,
      }),
      db.update(docDocument).set({ updatedAt: now }).where(eq(docDocument.id, documentId)),
    ])
  }
  catch (error) {
    await deleteStoredImages(event, [location])
    throw error
  }

  await notifyImagesChanged(event, actor, access, access.documentRow.title)

  return { document: await loadDocument(event, documentId), imageId: location.imageId }
}

export const deleteImage = async (actor: User, imageId: string, event: H3Event): Promise<DocDocument> => {
  const access = await getImageAccess(imageId, actor.id, event)
  const { documentRow, folderRow } = access
  const db = useDatabase(event)

  await db.batch([
    db.delete(docImage).where(eq(docImage.id, imageId)),
    db.update(docDocument).set({ updatedAt: new Date() }).where(eq(docDocument.id, documentRow.id)),
  ])
  await deleteStoredImages(event, [{ folderId: folderRow.id, documentId: documentRow.id, imageId }])

  await notifyImagesChanged(event, actor, access, documentRow.title)

  return loadDocument(event, documentRow.id)
}

const isSameImageSet = (imageIds: readonly string[], currentImageIds: ReadonlySet<string>): boolean =>
  imageIds.length === currentImageIds.size
  && new Set(imageIds).size === imageIds.length
  && imageIds.every(imageId => currentImageIds.has(imageId))

export const reorderImages = async (actor: User, documentId: string, imageIds: readonly string[], event: H3Event): Promise<DocDocument> => {
  const access = await getDocumentAccess(documentId, actor.id, event)
  const db = useDatabase(event)
  const currentImages = await db
    .select({ id: docImage.id })
    .from(docImage)
    .where(eq(docImage.documentId, documentId))

  if (!isSameImageSet(imageIds, new Set(currentImages.map(({ id }) => id)))) {
    throw invalidUpload(ERROR_KEYS.DOCS_INVALID_IMAGE_ORDER)
  }

  await db.batch([
    db.update(docDocument).set({ updatedAt: new Date() }).where(eq(docDocument.id, documentId)),
    ...imageIds.map((imageId, position) => db
      .update(docImage)
      .set({ position })
      .where(and(eq(docImage.id, imageId), eq(docImage.documentId, documentId)))),
  ])

  await notifyImagesChanged(event, actor, access, access.documentRow.title)

  return loadDocument(event, documentId)
}

const readStoredObject = async (event: H3Event, location: StoredImageLocation, variant: DocImageVariant): Promise<DocsBucketObjectBody> => {
  const object = await useDocsBucket(event).get(getImageStorageKey(location, variant))

  if (!object) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.DOCS_IMAGE_NOT_FOUND,
    })
  }

  return object
}

export const readStoredImage = (event: H3Event, { imageRow, folderId }: ReadableDocImage, variant: DocImageVariant): Promise<DocsBucketObjectBody> =>
  readStoredObject(event, { folderId, documentId: imageRow.documentId, imageId: imageRow.id }, variant)

export const createRecognitionImageReaders = (
  event: H3Event,
  access: DocDocumentAccess,
  imageIds: readonly string[],
): RecognitionImageReader[] =>
  imageIds.map(imageId => async () => {
    const object = await readStoredObject(event, { folderId: access.folderRow.id, documentId: access.documentRow.id, imageId }, 'preview')
    return object.blob()
  })
