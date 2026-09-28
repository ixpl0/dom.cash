import { crc32, deflateSync } from 'node:zlib'
import { expect, type APIRequestContext } from '@playwright/test'
import { BASE_URL } from '../constants'

interface DocField {
  name: string
  value: string
}

interface CreatedFolder {
  id: string
}

interface CreatedDocument {
  id: string
  folderId: string
}

interface UploadedImage {
  imageId: string
}

export interface TestImageFile {
  name: string
  mimeType: string
  buffer: Buffer
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
const PNG_BIT_DEPTH = 8
const PNG_TRUE_COLOR = 2
const PNG_NO_FILTER = 0

const SMALL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAMABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAQG/8QAIRAAAQIEBwAAAAAAAAAAAAAAEgARAQYTFAcVFiVDYqH/xAAVAQEBAAAAAAAAAAAAAAAAAAAGB//EACARAAECBQUAAAAAAAAAAAAAABMSUQADESIxASFSocH/2gAMAwEAAhEDEQA/AKsN5F1pmO42VpT4KhmXaDMPqYkSLovLtxvbupwUwAe0XcvFikVODPOQlnGmjPnO/UFVyxpTc9fI/9k=',
  'base64',
)

const createChunk = (type: string, data: Buffer): Buffer => {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([length, typeBytes, data, checksum])
}

export const createPngImage = (width = 320, height = 200, color: readonly [number, number, number] = [37, 99, 235]): Buffer => {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.writeUInt8(PNG_BIT_DEPTH, 8)
  header.writeUInt8(PNG_TRUE_COLOR, 9)

  const row = Buffer.concat([Buffer.from([PNG_NO_FILTER]), Buffer.from(Array.from({ length: width }, () => [...color]).flat())])
  const pixels = Buffer.concat(Array.from({ length: height }, () => row))

  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk('IHDR', header),
    createChunk('IDAT', deflateSync(pixels)),
    createChunk('IEND', Buffer.alloc(0)),
  ])
}

export const createPngFile = (name: string, color?: readonly [number, number, number]): TestImageFile => ({
  name,
  mimeType: 'image/png',
  buffer: createPngImage(320, 200, color),
})

export const createFolderThroughApi = async (request: APIRequestContext, name: string): Promise<CreatedFolder> => {
  const response = await request.post(`${BASE_URL}/api/docs/folders`, { data: { name } })
  expect(response.ok()).toBe(true)
  return response.json()
}

export const createDocumentThroughApi = async (
  request: APIRequestContext,
  folderId: string,
  title: string,
  fields: readonly DocField[] = [],
): Promise<CreatedDocument> => {
  const response = await request.post(`${BASE_URL}/api/docs/folders/${folderId}/documents`, { data: { title, fields } })
  expect(response.ok()).toBe(true)
  return response.json()
}

export const uploadImageThroughApi = async (
  request: APIRequestContext,
  documentId: string,
  fileName: string,
): Promise<UploadedImage> => {
  const original = createPngImage()
  const response = await request.post(`${BASE_URL}/api/docs/documents/${documentId}/images`, {
    params: {
      fileName,
      originalSize: original.length,
      previewSize: SMALL_JPEG.length,
      thumbnailSize: SMALL_JPEG.length,
      width: 320,
      height: 200,
    },
    headers: { 'content-type': 'application/octet-stream' },
    data: Buffer.concat([original, SMALL_JPEG, SMALL_JPEG]),
  })
  expect(response.ok()).toBe(true)
  return response.json()
}
