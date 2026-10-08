export const encodeBase64Url = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

export const decodeBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const base64 = value.replace(/=+$/, '').replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0))
}

export const getBase64UrlLength = (byteLength: number): number => Math.ceil(byteLength * 4 / 3)
