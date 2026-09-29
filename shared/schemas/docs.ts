import { z } from 'zod'

export const DOC_FOLDER_NAME_MAX_LENGTH = 100
export const DOC_TITLE_MAX_LENGTH = 100
export const DOC_FIELD_NAME_MAX_LENGTH = 100
export const DOC_FIELD_VALUE_MAX_LENGTH = 2000
export const DOC_FILE_NAME_MAX_LENGTH = 200
export const DOC_MAX_FIELDS = 100
export const DOC_MAX_DOCUMENTS = 100
export const DOC_MAX_IMAGES = 20
export const DOC_MAX_RECOGNITION_IMAGES = 10
export const DOC_MAX_SHARED_USERS = 50

export const DOC_IMAGE_MAX_SIZE = 20 * 1024 * 1024
export const DOC_PREVIEW_MAX_SIZE = 5 * 1024 * 1024
export const DOC_THUMBNAIL_MAX_SIZE = 1024 * 1024
export const DOC_UPLOAD_MAX_SIZE = DOC_IMAGE_MAX_SIZE + DOC_PREVIEW_MAX_SIZE + DOC_THUMBNAIL_MAX_SIZE
export const DOC_IMAGE_MAX_DIMENSION = 100_000
export const DOC_PREVIEW_MAX_DIMENSION = 2576
export const DOC_PREVIEW_MAX_VISUAL_TOKENS = 4784
export const DOC_VISUAL_TOKEN_SIZE = 28
export const DOC_THUMBNAIL_MAX_DIMENSION = 480

export const DOC_IMAGE_VARIANTS = ['original', 'preview', 'thumbnail'] as const

export const DOC_RECOGNITION_MODES = ['merge', 'replace'] as const

export const DOC_RECOGNITION_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

export const DOC_DEFAULT_RECOGNITION_EFFORT = 'low'

export const docFolderNameSchema = z.string().trim().min(1).max(DOC_FOLDER_NAME_MAX_LENGTH)

export const docTitleSchema = z.string().trim().max(DOC_TITLE_MAX_LENGTH)

export const docFieldSchema = z.object({
  name: z.string().trim().min(1).max(DOC_FIELD_NAME_MAX_LENGTH),
  value: z.string().trim().max(DOC_FIELD_VALUE_MAX_LENGTH),
})

export const docFieldsSchema = z.array(docFieldSchema).max(DOC_MAX_FIELDS)

const sharedWithUserIdsSchema = z.array(z.string()).max(DOC_MAX_SHARED_USERS)

export const createDocFolderSchema = z.object({
  name: docFolderNameSchema,
  sharedWithUserIds: sharedWithUserIdsSchema.optional(),
})

export const updateDocFolderSchema = z.object({
  name: docFolderNameSchema.optional(),
  sharedWithUserIds: sharedWithUserIdsSchema.optional(),
})

export const createDocDocumentSchema = z.object({
  title: docTitleSchema,
  fields: docFieldsSchema.optional(),
})

export const updateDocDocumentSchema = z.object({
  title: docTitleSchema.optional(),
  fields: docFieldsSchema.optional(),
})

export const docDocumentFormSchema = z.object({
  title: docTitleSchema,
  fields: docFieldsSchema,
})

export const reorderDocImagesSchema = z.object({
  imageIds: z.array(z.string()).min(1).max(DOC_MAX_IMAGES),
})

export const docRecognitionEffortSchema = z.enum(DOC_RECOGNITION_EFFORTS)

export const recognizeDocDocumentSchema = z.object({
  mode: z.enum(DOC_RECOGNITION_MODES),
  imageIds: z.array(z.string()).min(1).max(DOC_MAX_RECOGNITION_IMAGES).optional(),
  effort: docRecognitionEffortSchema.default(DOC_DEFAULT_RECOGNITION_EFFORT),
})

const imageDimensionSchema = z.coerce.number().int().positive().max(DOC_IMAGE_MAX_DIMENSION)

export const uploadDocImageQuerySchema = z.object({
  fileName: z.string().max(DOC_FILE_NAME_MAX_LENGTH),
  originalSize: z.coerce.number().int().positive().max(DOC_IMAGE_MAX_SIZE),
  previewSize: z.coerce.number().int().positive().max(DOC_PREVIEW_MAX_SIZE),
  thumbnailSize: z.coerce.number().int().positive().max(DOC_THUMBNAIL_MAX_SIZE),
  width: imageDimensionSchema.optional(),
  height: imageDimensionSchema.optional(),
})

export const docImageVariantSchema = z.enum(DOC_IMAGE_VARIANTS)
