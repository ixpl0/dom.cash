interface ImageSignature {
  contentType: string
  matches: (bytes: Uint8Array) => boolean
}

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'])
const HEIF_BRANDS = new Set(['mif1', 'msf1', 'heif'])
const AVIF_BRANDS = new Set(['avif', 'avis'])

const startsWithBytes = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte)

const readAscii = (bytes: Uint8Array, start: number, end: number): string =>
  bytes.length >= end ? String.fromCharCode(...bytes.subarray(start, end)) : ''

const hasFileTypeBrand = (bytes: Uint8Array, brands: ReadonlySet<string>): boolean =>
  readAscii(bytes, 4, 8) === 'ftyp' && brands.has(readAscii(bytes, 8, 12))

const IMAGE_SIGNATURES: readonly ImageSignature[] = [
  { contentType: 'image/jpeg', matches: bytes => startsWithBytes(bytes, [0xFF, 0xD8, 0xFF]) },
  { contentType: 'image/png', matches: bytes => startsWithBytes(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) },
  { contentType: 'image/gif', matches: bytes => readAscii(bytes, 0, 4) === 'GIF8' },
  { contentType: 'image/webp', matches: bytes => readAscii(bytes, 0, 4) === 'RIFF' && readAscii(bytes, 8, 12) === 'WEBP' },
  { contentType: 'image/avif', matches: bytes => hasFileTypeBrand(bytes, AVIF_BRANDS) },
  { contentType: 'image/heic', matches: bytes => hasFileTypeBrand(bytes, HEIC_BRANDS) },
  { contentType: 'image/heif', matches: bytes => hasFileTypeBrand(bytes, HEIF_BRANDS) },
  { contentType: 'image/bmp', matches: bytes => readAscii(bytes, 0, 2) === 'BM' },
  {
    contentType: 'image/tiff',
    matches: bytes => startsWithBytes(bytes, [0x49, 0x49, 0x2A, 0x00]) || startsWithBytes(bytes, [0x4D, 0x4D, 0x00, 0x2A]),
  },
]

export const detectImageContentType = (bytes: Uint8Array): string | null =>
  IMAGE_SIGNATURES.find(signature => signature.matches(bytes))?.contentType ?? null
