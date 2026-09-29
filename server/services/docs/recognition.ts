import { eq } from 'drizzle-orm'
import { createError, getCookie, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { docDocument } from '~~/server/db/schema'
import { getDocumentAccess, getParticipantIds } from '~~/server/services/docs/access'
import { listDocumentImages, loadDocument } from '~~/server/services/docs/documents'
import { createRecognitionImageReaders } from '~~/server/services/docs/images'
import { notifyDocsParticipants } from '~~/server/services/docs/notifications'
import { recognizeDocumentImages, type RecognitionLanguage } from '~~/server/services/docs/recognizer'
import { DOC_MAX_RECOGNITION_IMAGES } from '~~/shared/schemas/docs'
import type { User } from '~~/shared/types'
import type { DocField, DocRecognitionResult, RecognizeDocDocumentPayload } from '~~/shared/types/docs'
import { appendRecognizedFields, mergeRecognizedFields, normalizeRecognizedTitle, type RecognizedDocField } from '~~/shared/utils/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { LOCALE_COOKIE_NAME } from '~~/shared/utils/shared/locale'

interface RecognizedFields {
  fields: DocField[]
  addedFieldCount: number
}

export const readRecognitionLanguage = (event: H3Event): RecognitionLanguage =>
  getCookie(event, LOCALE_COOKIE_NAME) === 'ru' ? 'ru' : 'en'

const selectImageIds = (documentImageIds: readonly string[], requestedImageIds?: readonly string[]): string[] => {
  if (!requestedImageIds) {
    return documentImageIds.slice(0, DOC_MAX_RECOGNITION_IMAGES)
  }

  const documentImageIdSet = new Set(documentImageIds)

  if (requestedImageIds.some(imageId => !documentImageIdSet.has(imageId))) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.DOCS_IMAGE_NOT_FOUND,
    })
  }

  const requestedImageIdSet = new Set(requestedImageIds)

  return documentImageIds.filter(imageId => requestedImageIdSet.has(imageId))
}

const isSameFieldList = (firstFields: readonly DocField[], secondFields: readonly DocField[]): boolean =>
  firstFields.length === secondFields.length
  && firstFields.every((field, index) => field.name === secondFields[index]?.name && field.value === secondFields[index]?.value)

const buildFields = (
  mode: RecognizeDocDocumentPayload['mode'],
  sentFields: readonly DocField[],
  currentFields: readonly DocField[],
  recognizedFields: readonly RecognizedDocField[],
): RecognizedFields => {
  if (mode === 'replace') {
    const replacedFields = mergeRecognizedFields([], recognizedFields)
    return replacedFields.length > 0
      ? { fields: replacedFields, addedFieldCount: replacedFields.length }
      : { fields: [...currentFields], addedFieldCount: 0 }
  }

  const fields = isSameFieldList(sentFields, currentFields)
    ? mergeRecognizedFields(currentFields, recognizedFields)
    : appendRecognizedFields(currentFields, recognizedFields)

  return { fields, addedFieldCount: fields.length - currentFields.length }
}

export const recognizeDocument = async (
  actor: User,
  documentId: string,
  payload: RecognizeDocDocumentPayload,
  language: RecognitionLanguage,
  event: H3Event,
): Promise<DocRecognitionResult> => {
  const access = await getDocumentAccess(documentId, actor.id, event)
  const imageRows = await listDocumentImages(event, documentId)
  const imageIds = selectImageIds(imageRows.map(({ id }) => id), payload.imageIds)

  if (imageIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.DOCS_NO_IMAGES_TO_RECOGNIZE,
    })
  }

  const sentFields = payload.mode === 'merge' ? access.documentRow.fields : []
  const imageReaders = createRecognitionImageReaders(event, access, imageIds)
  const recognition = await recognizeDocumentImages({ imageReaders, existingFields: sentFields, language, effort: payload.effort })

  const db = useDatabase(event)
  const [currentRow] = await db.select().from(docDocument).where(eq(docDocument.id, documentId)).limit(1)

  if (!currentRow) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.DOCS_DOCUMENT_NOT_FOUND,
    })
  }

  const { fields, addedFieldCount } = buildFields(payload.mode, access.documentRow.fields, currentRow.fields, recognition.fields)
  const recognizedTitle = normalizeRecognizedTitle(recognition.title)
  const title = currentRow.title.trim() === '' && recognizedTitle !== '' ? recognizedTitle : currentRow.title

  await db
    .update(docDocument)
    .set({ title, fields, updatedAt: new Date() })
    .where(eq(docDocument.id, documentId))

  await notifyDocsParticipants(event, actor, {
    ownerId: access.folderRow.userId,
    recipientIds: getParticipantIds(access),
    type: 'docs_document_updated',
    params: { folderName: access.folderRow.name, documentTitle: title },
  })

  return {
    document: await loadDocument(event, documentId),
    addedFieldCount,
  }
}
