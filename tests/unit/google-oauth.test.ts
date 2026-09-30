import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { verifyGoogleToken } from '../../server/utils/google-oauth'

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com'

const validPayload = {
  sub: 'google-user-1',
  email: 'user@example.com',
  email_verified: 'true',
  name: 'Test User',
  aud: CLIENT_ID,
  exp: String(Math.floor(Date.now() / 1000) + 3600),
}

const useFakeTokenInfo = (context: TestContext, payload: Record<string, unknown>, status = 200): { getUrls: () => string[] } => {
  const previousFetch = globalThis.fetch
  const previousClientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  let urls: string[] = []

  process.env.GOOGLE_OAUTH_CLIENT_ID = CLIENT_ID
  globalThis.fetch = async (input: string | URL | Request): Promise<Response> => {
    urls = [...urls, new Request(input).url]
    return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
  }

  context.after(() => {
    globalThis.fetch = previousFetch
    if (previousClientId === undefined) {
      delete process.env.GOOGLE_OAUTH_CLIENT_ID
    }
    else {
      process.env.GOOGLE_OAUTH_CLIENT_ID = previousClientId
    }
  })

  return { getUrls: () => urls }
}

test('a token with a verified email gives the Google user', async (context) => {
  useFakeTokenInfo(context, validPayload)

  assert.deepEqual(await verifyGoogleToken('header.payload.signature'), {
    id: 'google-user-1',
    email: 'user@example.com',
    name: 'Test User',
    picture: undefined,
  })
})

test('a token whose email is verified as a boolean is accepted', async (context) => {
  useFakeTokenInfo(context, { ...validPayload, email_verified: true })

  assert.equal((await verifyGoogleToken('header.payload.signature')).email, 'user@example.com')
})

const unverifiedValues = [
  { name: 'is not verified', value: 'false' },
  { name: 'is not verified as a boolean', value: false },
  { name: 'has no verification flag', value: undefined },
]

unverifiedValues.forEach(({ name, value }) => {
  test(`a token whose email ${name} is refused`, async (context) => {
    useFakeTokenInfo(context, { ...validPayload, email_verified: value })

    await assert.rejects(verifyGoogleToken('header.payload.signature'), /Email is not verified/)
  })
})

test('a token issued for another application is refused', async (context) => {
  useFakeTokenInfo(context, { ...validPayload, aud: 'another-client-id' })

  await assert.rejects(verifyGoogleToken('header.payload.signature'), /Token audience mismatch/)
})

test('a token Google does not accept is refused', async (context) => {
  useFakeTokenInfo(context, { error_description: 'Invalid Value' }, 400)

  await assert.rejects(verifyGoogleToken('header.payload.signature'), /Google API responded with 400/)
})

test('the token cannot add parameters to the verification request', async (context) => {
  const fakeTokenInfo = useFakeTokenInfo(context, validPayload)

  await verifyGoogleToken('token&access_token=other')

  assert.deepEqual(fakeTokenInfo.getUrls(), ['https://oauth2.googleapis.com/tokeninfo?id_token=token%26access_token%3Dother'])
})
