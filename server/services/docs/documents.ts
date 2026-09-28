import { asc, count, eq } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { docDocument, docImage, type DocDocumentRow } from '~~/server/db/schema'
import { getDocumentAccess, getFolderAccess, getParticipantIds } from '~~/server/services/docs/access'
import { toDocDocument } from '~~/server/services/docs/mappers'
import { notifyDocsParticipants } from '~~/server/services/docs/notifications'
import { deleteStoredPrefixes, getDocumentStoragePrefix } from '~~/server/services/docs/storage'
import { DOC_MAX_DOCUMENTS } from '~~/shared/schemas/docs'
import type { User } from '~~/shared/types'
import type { CreateDocDocumentPayload, DocDocument, UpdateDocDocumentPayload } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export const listDocumentImages = (event: H3Event, documentId: string) =>
  useDatabase(event)
    .select()
    .from(docImage)
    .where(eq(docImage.documentId, documentId))
    .orderBy(asc(docImage.position), asc(docImage.createdAt))

export const loadDocument = async (event: H3Event, documentId: string): Promise<DocDocument> => {
  const [[documentRow], imageRows] = await Promise.all([
    useDatabase(event).select().from(docDocument).where(eq(docDocument.id, documentId)).limit(1),
    listDocumentImages(event, documentId),
  ])

  if (!documentRow) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.DOCS_DOCUMENT_NOT_FOUND,
    })
  }

  return toDocDocument(documentRow, imageRows)
}

export const createDocument = async (actor: User, folderId: string, payload: CreateDocDocumentPayload, event: H3Event): Promise<DocDocument> => {
  const access = await getFolderAccess(folderId, actor.id, event)
  const db = useDatabase(event)
  const [documentCount] = await db
    .select({ total: count() })
    .from(docDocument)
    .where(eq(docDocument.folderId, folderId))

  if ((documentCount?.total ?? 0) >= DOC_MAX_DOCUMENTS) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.DOCS_TOO_MANY_DOCUMENTS,
    })
  }

  const now = new Date()
  const documentRow: DocDocumentRow = {
    id: crypto.randomUUID(),
    folderId,
    title: payload.title,
    fields: payload.fields ?? [],
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(docDocument).values(documentRow)

  await notifyDocsParticipants(event, actor, {
    ownerId: access.folderRow.userId,
    recipientIds: getParticipantIds(access),
    type: 'docs_document_created',
    params: { folderName: access.folderRow.name, documentTitle: documentRow.title },
  })

  return toDocDocument(documentRow, [])
}

export const updateDocument = async (actor: User, documentId: string, payload: UpdateDocDocumentPayload, event: H3Event): Promise<DocDocument> => {
  const access = await getDocumentAccess(documentId, actor.id, event)
  const title = payload.title ?? access.documentRow.title
  const fields = payload.fields ?? access.documentRow.fields

  await useDatabase(event)
    .update(docDocument)
    .set({ title, fields, updatedAt: new Date() })
    .where(eq(docDocument.id, documentId))

  await notifyDocsParticipants(event, actor, {
    ownerId: access.folderRow.userId,
    recipientIds: getParticipantIds(access),
    type: 'docs_document_updated',
    params: { folderName: access.folderRow.name, documentTitle: title },
  })

  return loadDocument(event, documentId)
}

export const deleteDocument = async (actor: User, documentId: string, event: H3Event): Promise<void> => {
  const access = await getDocumentAccess(documentId, actor.id, event)

  await useDatabase(event).delete(docDocument).where(eq(docDocument.id, documentId))
  await deleteStoredPrefixes(event, [getDocumentStoragePrefix(access.folderRow.id, documentId)])

  await notifyDocsParticipants(event, actor, {
    ownerId: access.folderRow.userId,
    recipientIds: getParticipantIds(access),
    type: 'docs_document_deleted',
    params: { folderName: access.folderRow.name, documentTitle: access.documentRow.title },
  })
}
