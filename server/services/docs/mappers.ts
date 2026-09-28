import type { DocDocumentRow, DocFolder, DocImageRow } from '~~/server/db/schema'
import type { DocDocument, DocFolderSummary, DocImage, DocParticipant } from '~~/shared/types/docs'

export const toDocImage = (imageRow: DocImageRow): DocImage => ({
  id: imageRow.id,
  fileName: imageRow.fileName,
  contentType: imageRow.contentType,
  size: imageRow.size,
  width: imageRow.width,
  height: imageRow.height,
  createdAt: imageRow.createdAt.toISOString(),
})

export const toDocDocument = (documentRow: DocDocumentRow, imageRows: readonly DocImageRow[]): DocDocument => ({
  id: documentRow.id,
  folderId: documentRow.folderId,
  title: documentRow.title,
  fields: documentRow.fields,
  images: imageRows.map(toDocImage),
  createdAt: documentRow.createdAt.toISOString(),
  updatedAt: documentRow.updatedAt.toISOString(),
})

export const toFolderSummary = (
  folderRow: DocFolder,
  ownerUsername: string,
  sharedWith: readonly DocParticipant[],
  documentTitles: readonly string[],
  viewerId: string,
): DocFolderSummary => ({
  id: folderRow.id,
  name: folderRow.name,
  isOwner: folderRow.userId === viewerId,
  ownerUsername,
  sharedWith: sharedWith.filter(participant => participant.id !== viewerId),
  documentTitles: [...documentTitles],
  createdAt: folderRow.createdAt.toISOString(),
  updatedAt: folderRow.updatedAt.toISOString(),
})
