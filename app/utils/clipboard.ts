import { convertToPng } from '~/utils/doc-images'

const fetchImage = async (url: string): Promise<Blob> => {
  const response = await fetch(url, { credentials: 'same-origin' })

  if (!response.ok) {
    throw new Error(`Failed to load the image: ${response.status}`)
  }

  return convertToPng(await response.blob())
}

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  }
  catch {
    return false
  }
}

export const copyImageFromUrl = async (url: string): Promise<boolean> => {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': fetchImage(url) })])
    return true
  }
  catch {
    return false
  }
}
