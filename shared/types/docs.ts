import type { z } from 'zod'
import type {
  createDocDocumentSchema,
  createDocFolderSchema,
  docFieldSchema,
  docImageVariantSchema,
  docRecognitionEffortSchema,
  recognizeDocDocumentSchema,
  reorderDocImagesSchema,
  updateDocDocumentSchema,
  updateDocFolderSchema,
  uploadDocImageQuerySchema,
} from '~~/shared/schemas/docs'

export type DocField = z.infer<typeof docFieldSchema>

export type DocImageVariant = z.infer<typeof docImageVariantSchema>

export type DocRecognitionMode = z.infer<typeof recognizeDocDocumentSchema>['mode']

export type DocRecognitionEffort = z.infer<typeof docRecognitionEffortSchema>

export interface DocParticipant {
  id: string
  username: string
}

export interface DocImage {
  id: string
  fileName: string
  contentType: string
  size: number
  width: number | null
  height: number | null
  createdAt: string
}

export interface DocDocument {
  id: string
  folderId: string
  title: string
  fields: DocField[]
  images: DocImage[]
  createdAt: string
  updatedAt: string
}

export interface DocFolderSummary {
  id: string
  name: string
  isOwner: boolean
  ownerUsername: string
  sharedWith: DocParticipant[]
  documentTitles: string[]
  createdAt: string
  updatedAt: string
}

export interface DocFoldersData {
  folders: DocFolderSummary[]
}

export interface DocFolderDetails {
  folder: DocFolderSummary
  documents: DocDocument[]
  isRecognitionAvailable: boolean
}

export interface DocImageUploadResult {
  document: DocDocument
  imageId: string
}

export interface DocRecognitionResult {
  document: DocDocument
  addedFieldCount: number
}

export type CreateDocFolderPayload = z.infer<typeof createDocFolderSchema>

export type UpdateDocFolderPayload = z.infer<typeof updateDocFolderSchema>

export type CreateDocDocumentPayload = z.infer<typeof createDocDocumentSchema>

export type UpdateDocDocumentPayload = z.infer<typeof updateDocDocumentSchema>

export type RecognizeDocDocumentPayload = z.infer<typeof recognizeDocDocumentSchema>

export type ReorderDocImagesPayload = z.infer<typeof reorderDocImagesSchema>

export type UploadDocImageQuery = z.infer<typeof uploadDocImageQuerySchema>
