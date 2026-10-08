import { secureLog } from '~~/server/utils/secure-logger'
import { decodeBase64Url, encodeBase64Url } from '~~/shared/utils/shared/base64url'

type Bytes = Uint8Array<ArrayBuffer>

export interface VapidKeys {
  publicKey: string
  privateKey: string
  subject: string
}

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export type PushUrgency = 'very-low' | 'low' | 'normal' | 'high'

export interface PushOptions {
  ttlSeconds: number
  urgency: PushUrgency
  topic?: string
}

export interface PushResult {
  status: number
  isDelivered: boolean
  isGone: boolean
}

export type PushSender = (target: PushTarget, message: unknown, options: PushOptions) => Promise<PushResult>

export interface LocalKeys {
  privateKey: CryptoKey
  publicKey: Bytes
}

interface EncryptionOptions {
  localKeys?: LocalKeys
  salt?: Bytes
}

export const PUSH_RECORD_SIZE = 4096

const PUBLIC_KEY_BYTES = 65
const SALT_BYTES = 16
const RECORD_SIZE_BYTES = 4
const KEY_LENGTH_BYTES = 1
const TAG_BYTES = 16
const DELIMITER_BYTES = 1
const INPUT_KEY_BYTES = 32
const CONTENT_KEY_BYTES = 16
const NONCE_BYTES = 12
const SHARED_SECRET_BITS = 256
const LAST_RECORD_DELIMITER = 2
const HEADER_BYTES = SALT_BYTES + RECORD_SIZE_BYTES + KEY_LENGTH_BYTES + PUBLIC_KEY_BYTES

export const PUSH_PAYLOAD_MAX_BYTES = PUSH_RECORD_SIZE - HEADER_BYTES - TAG_BYTES - DELIMITER_BYTES

const VAPID_TOKEN_LIFETIME_SECONDS = 12 * 60 * 60
const GONE_STATUSES: readonly number[] = [404, 410]

const P256_ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const
const P256_ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const

const encoder = new TextEncoder()

const concatBytes = (...parts: readonly Uint8Array[]): Bytes =>
  Uint8Array.from(parts.flatMap(part => Array.from(part)))

const toUint32Bytes = (value: number): Bytes =>
  Uint8Array.of((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff)

const deriveKeyBytes = async (secret: Bytes, salt: Bytes, info: Bytes, byteLength: number): Promise<Bytes> => {
  const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, byteLength * 8))
}

const createLocalKeys = async (): Promise<LocalKeys> => {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(P256_ECDH, true, ['deriveBits'])
  return { privateKey, publicKey: new Uint8Array(await crypto.subtle.exportKey('raw', publicKey)) }
}

export const encryptPushMessage = async (
  plaintext: Bytes,
  { p256dh, auth }: Pick<PushTarget, 'p256dh' | 'auth'>,
  { localKeys, salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES)) }: EncryptionOptions = {},
): Promise<Bytes> => {
  if (plaintext.length > PUSH_PAYLOAD_MAX_BYTES) {
    throw new Error(`A push message holds at most ${PUSH_PAYLOAD_MAX_BYTES} bytes, got ${plaintext.length}`)
  }

  const { privateKey, publicKey } = localKeys ?? await createLocalKeys()
  const userPublicKeyBytes = decodeBase64Url(p256dh)
  const userPublicKey = await crypto.subtle.importKey('raw', userPublicKeyBytes, P256_ECDH, false, [])
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: userPublicKey }, privateKey, SHARED_SECRET_BITS))
  const keyInfo = concatBytes(encoder.encode('WebPush: info\0'), userPublicKeyBytes, publicKey)
  const inputKey = await deriveKeyBytes(sharedSecret, decodeBase64Url(auth), keyInfo, INPUT_KEY_BYTES)
  const contentKeyBytes = await deriveKeyBytes(inputKey, salt, encoder.encode('Content-Encoding: aes128gcm\0'), CONTENT_KEY_BYTES)
  const nonce = await deriveKeyBytes(inputKey, salt, encoder.encode('Content-Encoding: nonce\0'), NONCE_BYTES)
  const contentKey = await crypto.subtle.importKey('raw', contentKeyBytes, 'AES-GCM', false, ['encrypt'])
  const record = concatBytes(plaintext, Uint8Array.of(LAST_RECORD_DELIMITER))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, contentKey, record))

  return concatBytes(salt, toUint32Bytes(PUSH_RECORD_SIZE), Uint8Array.of(PUBLIC_KEY_BYTES), publicKey, ciphertext)
}

const encodeJson = (value: unknown): string => encodeBase64Url(encoder.encode(JSON.stringify(value)))

const importVapidPrivateKey = (keys: VapidKeys): Promise<CryptoKey> => {
  const publicKey = decodeBase64Url(keys.publicKey)
  const coordinateBytes = (PUBLIC_KEY_BYTES - 1) / 2

  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: keys.privateKey,
      x: encodeBase64Url(publicKey.slice(1, 1 + coordinateBytes)),
      y: encodeBase64Url(publicKey.slice(1 + coordinateBytes)),
    },
    P256_ECDSA,
    false,
    ['sign'],
  )
}

export const createVapidToken = async (audience: string, keys: VapidKeys, now: Date): Promise<string> => {
  const expiresAt = Math.floor(now.getTime() / 1000) + VAPID_TOKEN_LIFETIME_SECONDS
  const unsignedToken = `${encodeJson({ typ: 'JWT', alg: 'ES256' })}.${encodeJson({ aud: audience, exp: expiresAt, sub: keys.subject })}`
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await importVapidPrivateKey(keys), encoder.encode(unsignedToken))

  return `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`
}

const toPushResult = (status: number): PushResult => ({
  status,
  isDelivered: status >= 200 && status < 300,
  isGone: GONE_STATUSES.includes(status),
})

export const createWebPushSender = (keys: VapidKeys, now: Date): PushSender => {
  const tokens = new Map<string, Promise<string>>()

  const getToken = (audience: string): Promise<string> => {
    const token = tokens.get(audience) ?? createVapidToken(audience, keys, now)
    tokens.set(audience, token)
    return token
  }

  return async ({ endpoint, p256dh, auth }, message, { ttlSeconds, urgency, topic }) => {
    try {
      const body = await encryptPushMessage(encoder.encode(JSON.stringify(message)), { p256dh, auth })
      const token = await getToken(new URL(endpoint).origin)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `vapid t=${token}, k=${keys.publicKey}`,
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          'TTL': String(ttlSeconds),
          'Urgency': urgency,
          ...(topic ? { Topic: topic } : {}),
        },
        body,
      })
      await response.body?.cancel()
      return toPushResult(response.status)
    }
    catch (error) {
      secureLog.error('Failed to send a push message:', error)
      return toPushResult(0)
    }
  }
}
