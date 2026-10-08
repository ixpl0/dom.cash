import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { createVapidToken, createWebPushSender, encryptPushMessage, PUSH_PAYLOAD_MAX_BYTES, type LocalKeys, type VapidKeys } from '../../server/utils/web-push'
import { decodeBase64Url, encodeBase64Url } from '../../shared/utils/shared/base64url'

type Bytes = Uint8Array<ArrayBuffer>

interface RecordedRequest {
  url: string
  method: string
  headers: Headers
  body: Bytes
}

const RFC_PLAINTEXT = 'When I grow up, I want to be a watermelon'
const RFC_AUTH_SECRET = 'BTBZMqHH6r4Tts7J_aSIgg'
const RFC_USER_AGENT_PUBLIC_KEY = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'
const RFC_SERVER_PUBLIC_KEY = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'
const RFC_SERVER_PRIVATE_KEY = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'
const RFC_SALT = 'DGv6ra1nlYgDCS1FRnbzlw'
const RFC_MESSAGE = [
  'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml',
  'mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT',
  'pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
].join('')

const P256_ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const
const P256_ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const
const HEADER_BYTES = 86
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toJwk = (publicKey: Uint8Array, privateKey: string): JsonWebKey => ({
  kty: 'EC',
  crv: 'P-256',
  d: privateKey,
  x: encodeBase64Url(publicKey.slice(1, 33)),
  y: encodeBase64Url(publicKey.slice(33, 65)),
})

const importServerKeys = async (): Promise<LocalKeys> => {
  const publicKey = decodeBase64Url(RFC_SERVER_PUBLIC_KEY)
  const privateKey = await crypto.subtle.importKey('jwk', toJwk(publicKey, RFC_SERVER_PRIVATE_KEY), P256_ECDH, false, ['deriveBits'])
  return { privateKey, publicKey }
}

interface UserAgentKeys {
  privateKey: CryptoKey
  p256dh: string
  auth: string
}

const createUserAgentKeys = async (): Promise<UserAgentKeys> => {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(P256_ECDH, true, ['deriveBits'])
  return {
    privateKey,
    p256dh: encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', publicKey))),
    auth: encodeBase64Url(crypto.getRandomValues(new Uint8Array(16))),
  }
}

const deriveBytes = async (secret: Bytes, salt: Bytes, info: Bytes, byteLength: number): Promise<Bytes> => {
  const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, byteLength * 8))
}

const joinBytes = (...parts: Uint8Array[]): Bytes => Uint8Array.from(parts.flatMap(part => Array.from(part)))

const decryptAsUserAgent = async (message: Bytes, { privateKey, p256dh, auth }: UserAgentKeys): Promise<string> => {
  const salt = message.slice(0, 16)
  const recordSize = new DataView(message.buffer).getUint32(16)
  const keyLength = message[20] ?? 0
  const serverPublicKeyBytes = message.slice(21, 21 + keyLength)
  const serverPublicKey = await crypto.subtle.importKey('raw', serverPublicKeyBytes, P256_ECDH, false, [])
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: serverPublicKey }, privateKey, 256))
  const keyInfo = joinBytes(encoder.encode('WebPush: info\0'), decodeBase64Url(p256dh), serverPublicKeyBytes)
  const inputKey = await deriveBytes(sharedSecret, decodeBase64Url(auth), keyInfo, 32)
  const contentKey = await crypto.subtle.importKey('raw', await deriveBytes(inputKey, salt, encoder.encode('Content-Encoding: aes128gcm\0'), 16), 'AES-GCM', false, ['decrypt'])
  const nonce = await deriveBytes(inputKey, salt, encoder.encode('Content-Encoding: nonce\0'), 12)
  const record = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, contentKey, message.slice(21 + keyLength)))

  assert.equal(recordSize, 4096)
  assert.equal(keyLength, 65)
  assert.equal(record.at(-1), 2)
  return decoder.decode(record.slice(0, -1))
}

const createVapidKeys = async (): Promise<{ keys: VapidKeys, verifyKey: CryptoKey }> => {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(P256_ECDSA, true, ['sign', 'verify'])
  const privateJwk = await crypto.subtle.exportKey('jwk', privateKey)
  return {
    keys: {
      publicKey: encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', publicKey))),
      privateKey: privateJwk.d ?? '',
      subject: 'mailto:admin@example.com',
    },
    verifyKey: publicKey,
  }
}

const decodeJsonPart = (part: string | undefined): unknown => JSON.parse(decoder.decode(decodeBase64Url(part ?? '')))

const useFakePushService = (context: TestContext, reply: (request: RecordedRequest) => Response | Promise<Response>): (() => RecordedRequest[]) => {
  const previousFetch = globalThis.fetch
  let requests: RecordedRequest[] = []

  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init)
    const recorded = {
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: new Uint8Array(await request.arrayBuffer()),
    }
    requests = [...requests, recorded]
    return reply(recorded)
  }
  context.after(() => {
    globalThis.fetch = previousFetch
  })

  return () => requests
}

test('encryptPushMessage reproduces the RFC 8291 example', async () => {
  const message = await encryptPushMessage(
    encoder.encode(RFC_PLAINTEXT),
    { p256dh: RFC_USER_AGENT_PUBLIC_KEY, auth: RFC_AUTH_SECRET },
    { localKeys: await importServerKeys(), salt: decodeBase64Url(RFC_SALT) },
  )

  assert.deepEqual(message, decodeBase64Url(RFC_MESSAGE))
})

test('encryptPushMessage uses a new key and salt for every message that the user agent can read', async () => {
  const userAgent = await createUserAgentKeys()
  const plaintext = JSON.stringify({ title: 'Задачи на сегодня', body: 'Оплатить интернет' })

  const first = await encryptPushMessage(encoder.encode(plaintext), userAgent)
  const second = await encryptPushMessage(encoder.encode(plaintext), userAgent)

  assert.equal(await decryptAsUserAgent(first, userAgent), plaintext)
  assert.equal(await decryptAsUserAgent(second, userAgent), plaintext)
  assert.notDeepEqual(first.slice(0, HEADER_BYTES), second.slice(0, HEADER_BYTES))
})

test('encryptPushMessage refuses a message longer than one record holds', async () => {
  const userAgent = await createUserAgentKeys()

  assert.equal(PUSH_PAYLOAD_MAX_BYTES, 3993)
  await assert.doesNotReject(encryptPushMessage(new Uint8Array(3993), userAgent))
  await assert.rejects(encryptPushMessage(new Uint8Array(3994), userAgent), /at most 3993 bytes/)
})

test('createVapidToken signs the audience, the expiry and the subject with the private key', async () => {
  const { keys, verifyKey } = await createVapidKeys()
  const now = new Date('2026-10-09T06:00:00Z')

  const token = await createVapidToken('https://fcm.googleapis.com', keys, now)
  const [header, claims, signature] = token.split('.')

  assert.deepEqual(decodeJsonPart(header), { typ: 'JWT', alg: 'ES256' })
  assert.deepEqual(decodeJsonPart(claims), {
    aud: 'https://fcm.googleapis.com',
    exp: Date.parse('2026-10-09T18:00:00Z') / 1000,
    sub: 'mailto:admin@example.com',
  })
  assert.equal(await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    verifyKey,
    decodeBase64Url(signature ?? ''),
    encoder.encode(`${header}.${claims}`),
  ), true)
})

test('createWebPushSender posts an encrypted message with VAPID and delivery headers', async (context) => {
  const { keys } = await createVapidKeys()
  const userAgent = await createUserAgentKeys()
  const getRequests = useFakePushService(context, () => new Response(null, { status: 201 }))
  const send = createWebPushSender(keys, new Date('2026-10-09T06:00:00Z'))
  const target = { endpoint: 'https://fcm.googleapis.com/fcm/send/device-1', ...userAgent }

  const result = await send(target, { title: 'Hello' }, { ttlSeconds: 3600, urgency: 'high', topic: 'todo-digest' })

  const [request] = getRequests()
  assert.deepEqual(result, { status: 201, isDelivered: true, isGone: false })
  assert.equal(request?.url, target.endpoint)
  assert.equal(request?.method, 'POST')
  assert.match(request?.headers.get('authorization') ?? '', new RegExp(`^vapid t=[\\w-]+\\.[\\w-]+\\.[\\w-]+, k=${keys.publicKey}$`))
  assert.equal(request?.headers.get('content-encoding'), 'aes128gcm')
  assert.equal(request?.headers.get('content-type'), 'application/octet-stream')
  assert.equal(request?.headers.get('ttl'), '3600')
  assert.equal(request?.headers.get('urgency'), 'high')
  assert.equal(request?.headers.get('topic'), 'todo-digest')
  assert.equal(await decryptAsUserAgent(request?.body ?? new Uint8Array(), userAgent), '{"title":"Hello"}')
})

test('createWebPushSender signs one token per push service', async (context) => {
  const { keys } = await createVapidKeys()
  const userAgent = await createUserAgentKeys()
  const getRequests = useFakePushService(context, () => new Response(null, { status: 201 }))
  const send = createWebPushSender(keys, new Date('2026-10-09T06:00:00Z'))
  const options = { ttlSeconds: 60, urgency: 'normal' } as const

  await send({ endpoint: 'https://fcm.googleapis.com/fcm/send/device-1', ...userAgent }, {}, options)
  await send({ endpoint: 'https://fcm.googleapis.com/fcm/send/device-2', ...userAgent }, {}, options)
  await send({ endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/device-3', ...userAgent }, {}, options)

  const authorizations = getRequests().map(request => request.headers.get('authorization'))
  assert.equal(authorizations[0], authorizations[1])
  assert.notEqual(authorizations[0], authorizations[2])
  assert.equal(getRequests()[0]?.headers.get('topic'), null)
})

test('createWebPushSender reports gone subscriptions and failed requests', async (context) => {
  const { keys } = await createVapidKeys()
  const userAgent = await createUserAgentKeys()
  const statuses = new Map([['gone', 410], ['missing', 404], ['busy', 429]])
  const errorLog = context.mock.method(console, 'error', () => {})
  useFakePushService(context, (request) => {
    const status = statuses.get(request.url.split('/').at(-1) ?? '')
    if (!status) {
      throw new TypeError('Network error')
    }
    return new Response(null, { status })
  })
  const send = createWebPushSender(keys, new Date('2026-10-09T06:00:00Z'))
  const sendTo = (name: string) => send({ endpoint: `https://fcm.googleapis.com/fcm/send/${name}`, ...userAgent }, {}, { ttlSeconds: 60, urgency: 'normal' })

  assert.deepEqual(await sendTo('gone'), { status: 410, isDelivered: false, isGone: true })
  assert.deepEqual(await sendTo('missing'), { status: 404, isDelivered: false, isGone: true })
  assert.deepEqual(await sendTo('busy'), { status: 429, isDelivered: false, isGone: false })
  assert.deepEqual(await sendTo('offline'), { status: 0, isDelivered: false, isGone: false })
  assert.equal(errorLog.mock.callCount(), 1)
})
