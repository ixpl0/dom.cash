import { and, asc, eq, inArray, or } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { docDocument, docFolder, docFolderShare, docImage, user, type DocDocumentRow, type DocFolder, type DocImageRow } from '~~/server/db/schema'
import type { DocParticipant } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export interface DocFolderAccess {
  folderRow: DocFolder
  ownerUsername: string
  sharedWith: DocParticipant[]
  isOwner: boolean
}

export interface DocDocumentAccess extends DocFolderAccess {
  documentRow: DocDocumentRow
}

export interface DocImageAccess extends DocDocumentAccess {
  imageRow: DocImageRow
}

export interface ReadableDocImage {
  imageRow: DocImageRow
  folderId: string
}

type Database = ReturnType<typeof useDatabase>

export const isFolderVisibleTo = (db: Database, viewerId: string) => or(
  eq(docFolder.userId, viewerId),
  inArray(docFolder.id, db.select({ folderId: docFolderShare.folderId }).from(docFolderShare).where(eq(docFolderShare.sharedWithId, viewerId))),
)

const listSharedWith = (db: Database, folderId: string): Promise<DocParticipant[]> =>
  db
    .select({ id: user.id, username: user.username })
    .from(docFolderShare)
    .innerJoin(user, eq(docFolderShare.sharedWithId, user.id))
    .where(eq(docFolderShare.folderId, folderId))
    .orderBy(asc(docFolderShare.createdAt))

const checkParticipant = (folderRow: DocFolder, sharedWith: readonly DocParticipant[], viewerId: string): boolean => {
  const isOwner = folderRow.userId === viewerId

  if (!isOwner && !sharedWith.some(participant => participant.id === viewerId)) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.DOCS_NO_ACCESS,
    })
  }

  return isOwner
}

export const getParticipantIds = ({ folderRow, sharedWith }: Pick<DocFolderAccess, 'folderRow' | 'sharedWith'>): string[] =>
  [folderRow.userId, ...sharedWith.map(participant => participant.id)]

export const getFolderAccess = async (folderId: string, viewerId: string, event: H3Event): Promise<DocFolderAccess> => {
  const db = useDatabase(event)
  const [found] = await db
    .select({ folderRow: docFolder, ownerUsername: user.username })
    .from(docFolder)
    .innerJoin(user, eq(docFolder.userId, user.id))
    .where(eq(docFolder.id, folderId))
    .limit(1)

  if (!found) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.DOCS_FOLDER_NOT_FOUND,
    })
  }

  const sharedWith = await listSharedWith(db, folderId)
  const isOwner = checkParticipant(found.folderRow, sharedWith, viewerId)

  return { ...found, sharedWith, isOwner }
}

export const getDocumentAccess = async (documentId: string, viewerId: string, event: H3Event): Promise<DocDocumentAccess> => {
  const db = useDatabase(event)
  const [found] = await db
    .select({ documentRow: docDocument, folderRow: docFolder, ownerUsername: user.username })
    .from(docDocument)
    .innerJoin(docFolder, eq(docDocument.folderId, docFolder.id))
    .innerJoin(user, eq(docFolder.userId, user.id))
    .where(eq(docDocument.id, documentId))
    .limit(1)

  if (!found) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.DOCS_DOCUMENT_NOT_FOUND,
    })
  }

  const sharedWith = await listSharedWith(db, found.folderRow.id)
  const isOwner = checkParticipant(found.folderRow, sharedWith, viewerId)

  return { ...found, sharedWith, isOwner }
}

export const getImageAccess = async (imageId: string, viewerId: string, event: H3Event): Promise<DocImageAccess> => {
  const db = useDatabase(event)
  const [found] = await db
    .select({ imageRow: docImage, documentRow: docDocument, folderRow: docFolder, ownerUsername: user.username })
    .from(docImage)
    .innerJoin(docDocument, eq(docImage.documentId, docDocument.id))
    .innerJoin(docFolder, eq(docDocument.folderId, docFolder.id))
    .innerJoin(user, eq(docFolder.userId, user.id))
    .where(eq(docImage.id, imageId))
    .limit(1)

  if (!found) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.DOCS_IMAGE_NOT_FOUND,
    })
  }

  const sharedWith = await listSharedWith(db, found.folderRow.id)
  const isOwner = checkParticipant(found.folderRow, sharedWith, viewerId)

  return { ...found, sharedWith, isOwner }
}

export const findReadableImage = async (imageId: string, viewerId: string, event: H3Event): Promise<ReadableDocImage> => {
  const db = useDatabase(event)
  const [found] = await db
    .select({ imageRow: docImage, folderId: docDocument.folderId })
    .from(docImage)
    .innerJoin(docDocument, eq(docImage.documentId, docDocument.id))
    .innerJoin(docFolder, eq(docDocument.folderId, docFolder.id))
    .where(and(eq(docImage.id, imageId), isFolderVisibleTo(db, viewerId)))
    .limit(1)

  if (!found) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.DOCS_IMAGE_NOT_FOUND,
    })
  }

  return found
}
