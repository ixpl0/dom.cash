import { encodeBase64Url } from '../shared/utils/shared/base64url'

const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', publicKey))
const { d } = await crypto.subtle.exportKey('jwk', privateKey)

console.log(`VAPID_PUBLIC_KEY=${encodeBase64Url(publicKeyBytes)}`)
console.log(`VAPID_PRIVATE_KEY=${d ?? ''}`)
