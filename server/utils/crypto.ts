export const timingSafeCompare = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) {
    return false
  }

  let diff = 0

  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }

  return diff === 0
}

export const timingSafeCompareStrings = (a: string, b: string): boolean => {
  const encoder = new TextEncoder()
  return timingSafeCompare(encoder.encode(a), encoder.encode(b))
}
