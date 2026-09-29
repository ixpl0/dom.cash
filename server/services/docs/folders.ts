import { asc, eq, inArray } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { docDocument, docFolder, docFolderShare, docImage, user, type DocFolder, type DocImageRow } from '~~/server/db/schema'
import { resolveConnections, resolveSharedUsers } from '~~/server/services/connections'
import { getFolderAccess, getParticipantIds, isFolderVisibleTo } from '~~/server/services/docs/access'
import { toDocDocument, toFolderSummary } from '~~/server/services/docs/mappers'
import { notifyDocsParticipants } from '~~/server/services/docs/notifications'
import { isRecognitionAvailable } from '~~/server/services/docs/recognizer'
import { deleteStoredPrefixes, getFolderStoragePrefix } from '~~/server/services/docs/storage'
import { chunkArray, getRowsPerInsertStatement } from '~~/server/utils/d1-limits'
import type { User } from '~~/shared/types'
import type { CreateDocFolderPayload, DocFolderDetails, DocFolderSummary, DocParticipant, UpdateDocFolderPayload } from '~~/shared/types/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

type Database = ReturnType<typeof useDatabase>

const groupBy = <T, K>(items: readonly T[], getKey: (item: T) => K): Map<K, T[]> =>
  items.reduce(
    (groups, item) => groups.set(getKey(item), [...(groups.get(getKey(item)) ?? []), item]),
    new Map<K, T[]>(),
  )

const buildShareInserts = (db: Database, folderId: string, sharedUsers: readonly DocParticipant[], createdAt: Date) =>
  chunkArray(
    sharedUsers.map(sharedUser => ({ id: crypto.randomUUID(), folderId, sharedWithId: sharedUser.id, createdAt })),
    getRowsPerInsertStatement(docFolderShare),
  ).map(shareRows => db.insert(docFolderShare).values(shareRows))

const listDocumentTitles = async (db: Database, folderId: string): Promise<string[]> =>
  (await db
    .select({ title: docDocument.title })
    .from(docDocument)
    .where(eq(docDocument.folderId, folderId))
    .orderBy(asc(docDocument.createdAt), asc(docDocument.id)))
    .map(({ title }) => title)

export const listFolders = async (viewerId: string, event: H3Event): Promise<DocFolderSummary[]> => {
  const db = useDatabase(event)
  const visibleFolderIds = () => db.select({ id: docFolder.id }).from(docFolder).where(isFolderVisibleTo(db, viewerId))

  const [folderRows, shareRows, documentRows] = await Promise.all([
    db
      .select({ folderRow: docFolder, ownerUsername: user.username })
      .from(docFolder)
      .innerJoin(user, eq(docFolder.userId, user.id))
      .where(isFolderVisibleTo(db, viewerId))
      .orderBy(asc(docFolder.createdAt), asc(docFolder.id)),
    db
      .select({ folderId: docFolderShare.folderId, id: user.id, username: user.username })
      .from(docFolderShare)
      .innerJoin(user, eq(docFolderShare.sharedWithId, user.id))
      .where(inArray(docFolderShare.folderId, visibleFolderIds()))
      .orderBy(asc(docFolderShare.createdAt)),
    db
      .select({ folderId: docDocument.folderId, title: docDocument.title })
      .from(docDocument)
      .where(inArray(docDocument.folderId, visibleFolderIds()))
      .orderBy(asc(docDocument.createdAt), asc(docDocument.id)),
  ])

  const sharesByFolder = groupBy(shareRows, share => share.folderId)
  const documentsByFolder = groupBy(documentRows, document => document.folderId)

  return folderRows.map(({ folderRow, ownerUsername }) => toFolderSummary(
    folderRow,
    ownerUsername,
    (sharesByFolder.get(folderRow.id) ?? []).map(({ id, username }) => ({ id, username })),
    (documentsByFolder.get(folderRow.id) ?? []).map(({ title }) => title),
    viewerId,
  ))
}

export const getFolderDetails = async (viewer: User, folderId: string, event: H3Event): Promise<DocFolderDetails> => {
  const access = await getFolderAccess(folderId, viewer.id, event)
  const db = useDatabase(event)

  const [documentRows, imageRows] = await Promise.all([
    db
      .select()
      .from(docDocument)
      .where(eq(docDocument.folderId, folderId))
      .orderBy(asc(docDocument.createdAt), asc(docDocument.id)),
    db
      .select({ imageRow: docImage })
      .from(docImage)
      .innerJoin(docDocument, eq(docImage.documentId, docDocument.id))
      .where(eq(docDocument.folderId, folderId))
      .orderBy(asc(docImage.position), asc(docImage.createdAt)),
  ])

  const imagesByDocument = groupBy(imageRows.map(({ imageRow }) => imageRow), (imageRow: DocImageRow) => imageRow.documentId)

  return {
    folder: toFolderSummary(access.folderRow, access.ownerUsername, access.sharedWith, documentRows.map(({ title }) => title), viewer.id),
    documents: documentRows.map(documentRow => toDocDocument(documentRow, imagesByDocument.get(documentRow.id) ?? [])),
    isRecognitionAvailable: isRecognitionAvailable(),
  }
}

export const createFolder = async (actor: User, payload: CreateDocFolderPayload, event: H3Event): Promise<DocFolderSummary> => {
  const sharedWith = await resolveConnections(actor.id, payload.sharedWithUserIds ?? [], event)
  const now = new Date()
  const folderRow: DocFolder = {
    id: crypto.randomUUID(),
    userId: actor.id,
    name: payload.name,
    createdAt: now,
    updatedAt: now,
  }

  const db = useDatabase(event)
  await db.batch([
    db.insert(docFolder).values(folderRow),
    ...buildShareInserts(db, folderRow.id, sharedWith, now),
  ])

  await notifyDocsParticipants(event, actor, {
    ownerId: actor.id,
    recipientIds: sharedWith.map(participant => participant.id),
    type: 'docs_folder_shared',
    params: { folderName: folderRow.name },
  })

  return toFolderSummary(folderRow, actor.username, sharedWith, [], actor.id)
}

export const updateFolder = async (actor: User, folderId: string, payload: UpdateDocFolderPayload, event: H3Event): Promise<DocFolderSummary> => {
  const access = await getFolderAccess(folderId, actor.id, event)

  if (!access.isOwner && payload.sharedWithUserIds !== undefined) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.CANNOT_MODIFY_SHARE_AS_NON_OWNER,
    })
  }

  const newSharedWith = payload.sharedWithUserIds === undefined
    ? null
    : await resolveSharedUsers(actor.id, payload.sharedWithUserIds, access.sharedWith, event)
  const updatedRow: DocFolder = {
    ...access.folderRow,
    name: payload.name ?? access.folderRow.name,
    updatedAt: new Date(),
  }

  const db = useDatabase(event)
  const replaceShares = newSharedWith
    ? [db.delete(docFolderShare).where(eq(docFolderShare.folderId, folderId)), ...buildShareInserts(db, folderId, newSharedWith, updatedRow.updatedAt)]
    : []

  await db.batch([
    db.update(docFolder).set({ name: updatedRow.name, updatedAt: updatedRow.updatedAt }).where(eq(docFolder.id, folderId)),
    ...replaceShares,
  ])

  const sharedWith = newSharedWith ?? access.sharedWith
  const previousIds = new Set(access.sharedWith.map(participant => participant.id))
  const currentIds = new Set(sharedWith.map(participant => participant.id))
  const params = { folderName: updatedRow.name }

  await Promise.all([
    notifyDocsParticipants(event, actor, {
      ownerId: updatedRow.userId,
      recipientIds: [...currentIds].filter(userId => !previousIds.has(userId)),
      type: 'docs_folder_shared',
      params,
    }),
    notifyDocsParticipants(event, actor, {
      ownerId: updatedRow.userId,
      recipientIds: [...previousIds].filter(userId => !currentIds.has(userId)),
      type: 'docs_folder_unshared',
      params,
    }),
    updatedRow.name === access.folderRow.name
      ? Promise.resolve()
      : notifyDocsParticipants(event, actor, {
          ownerId: updatedRow.userId,
          recipientIds: [updatedRow.userId, ...[...currentIds].filter(userId => previousIds.has(userId))],
          type: 'docs_folder_updated',
          params,
        }),
  ])

  return toFolderSummary(updatedRow, access.ownerUsername, sharedWith, await listDocumentTitles(db, folderId), actor.id)
}

export const deleteFolder = async (actor: User, folderId: string, event: H3Event): Promise<void> => {
  const access = await getFolderAccess(folderId, actor.id, event)

  await useDatabase(event).delete(docFolder).where(eq(docFolder.id, folderId))
  await deleteStoredPrefixes(event, [getFolderStoragePrefix(folderId)])

  await notifyDocsParticipants(event, actor, {
    ownerId: access.folderRow.userId,
    recipientIds: getParticipantIds(access),
    type: 'docs_folder_deleted',
    params: { folderName: access.folderRow.name },
  })
}

export const listOwnedFolderIds = async (ownerId: string, event: H3Event): Promise<string[]> =>
  (await useDatabase(event).select({ id: docFolder.id }).from(docFolder).where(eq(docFolder.userId, ownerId)))
    .map(({ id }) => id)

export const deleteFolderFiles = async (folderIds: readonly string[], event: H3Event): Promise<void> => {
  await deleteStoredPrefixes(event, folderIds.map(getFolderStoragePrefix))
}
