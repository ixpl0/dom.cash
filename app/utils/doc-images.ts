import { DOC_PREVIEW_MAX_SIZE, DOC_THUMBNAIL_MAX_DIMENSION } from '~~/shared/schemas/docs'
import { getDocPreviewSize, type ImageSize } from '~~/shared/utils/docs'

export interface DocImageVariants {
  preview: Blob
  thumbnail: Blob
  width: number
  height: number
}

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

export const IMAGE_UNREADABLE_ERROR = 'image-unreadable'

const GENERATED_IMAGE_TYPE = 'image/jpeg'
const PREVIEW_QUALITY = 0.9
const REDUCED_PREVIEW_QUALITY = 0.75
const THUMBNAIL_QUALITY = 0.8
const BACKGROUND_COLOR = '#ffffff'
const COPY_MAX_DIMENSION = 4096

const decodeWithBitmap = async (file: Blob): Promise<DecodedImage> => {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
}

const decodeWithImageElement = async (file: Blob): Promise<DecodedImage> => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url

  try {
    await image.decode()
  }
  catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }

  return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) }
}

const decodeImage = async (file: Blob): Promise<DecodedImage> => {
  try {
    return await decodeWithBitmap(file)
  }
  catch {
    try {
      return await decodeWithImageElement(file)
    }
    catch {
      throw new Error(IMAGE_UNREADABLE_ERROR)
    }
  }
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      }
      else {
        reject(new Error(IMAGE_UNREADABLE_ERROR))
      }
    }, type, quality)
  })

const fitWithin = ({ width, height }: ImageSize, maxDimension: number): ImageSize => {
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

const drawImage = (image: DecodedImage, { width, height }: ImageSize): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error(IMAGE_UNREADABLE_ERROR)
  }

  context.fillStyle = BACKGROUND_COLOR
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(image.source, 0, 0, canvas.width, canvas.height)

  return canvas
}

const createPreview = async (image: DecodedImage): Promise<Blob> => {
  const canvas = drawImage(image, getDocPreviewSize(image))
  const preview = await canvasToBlob(canvas, GENERATED_IMAGE_TYPE, PREVIEW_QUALITY)

  return preview.size > DOC_PREVIEW_MAX_SIZE ? canvasToBlob(canvas, GENERATED_IMAGE_TYPE, REDUCED_PREVIEW_QUALITY) : preview
}

export const createDocImageVariants = async (file: Blob): Promise<DocImageVariants> => {
  const image = await decodeImage(file)

  try {
    const [preview, thumbnail] = await Promise.all([
      createPreview(image),
      canvasToBlob(drawImage(image, fitWithin(image, DOC_THUMBNAIL_MAX_DIMENSION)), GENERATED_IMAGE_TYPE, THUMBNAIL_QUALITY),
    ])

    return { preview, thumbnail, width: image.width, height: image.height }
  }
  finally {
    image.release()
  }
}

export const convertToPng = async (file: Blob): Promise<Blob> => {
  if (file.type === 'image/png') {
    return file
  }

  const image = await decodeImage(file)

  try {
    return await canvasToBlob(drawImage(image, fitWithin(image, COPY_MAX_DIMENSION)), 'image/png')
  }
  finally {
    image.release()
  }
}
